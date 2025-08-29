// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// Counters removed for OpenZeppelin v5 compatibility
import "./GasFeeManager.sol";
import "./RateLimiter.sol";

/**
 * @title TransactionOrchestrator
 * @dev Integrated contract that combines GasFeeManager and RateLimiter functionality
 * @dev Provides complete transaction management for efficient local node operation
 * @dev Handles gas fees, rate limiting, and transaction execution in a unified system
 */
contract TransactionOrchestrator is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    // Counters usage removed for OpenZeppelin v5 compatibility

    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant ORCHESTRATOR_ROLE = keccak256("ORCHESTRATOR_ROLE");

    // Contract references
    GasFeeManager public gasFeeManager;
    RateLimiter public rateLimiter;

    // Transaction management
    struct OrchestratedTransaction {
        uint256 id;
        address user;
        address target;
        uint256 value;
        bytes data;
        uint256 gasLimit;
        uint256 maxFeePerGas;
        uint256 maxPriorityFeePerGas;
        address tokenAddress;
        uint256 tokenAmount;
        RateLimiter.Priority priority;
        bool gasFeesPaid;
        bool rateLimitChecked;
        bool executed;
        bool failed;
        string failureReason;
        uint256 timestamp;
        uint256 executionTime;
    }

    // State variables
    mapping(uint256 => OrchestratedTransaction) public orchestratedTransactions;
    mapping(address => uint256[]) public userTransactions;
    mapping(RateLimiter.Priority => uint256[]) public priorityExecutionQueue;
    
    uint256 private _transactionCounter;
    
    // Configuration
    uint256 public maxBatchSize = 10;
    uint256 public executionTimeout = 300; // 5 minutes
    uint256 public minExecutionInterval = 1; // 1 second
    uint256 public lastExecutionTime;
    
    // Fee configuration
    uint256 public orchestratorFeePercentage = 25; // 0.25% in basis points
    address public orchestratorFeeCollector;
    
    // Performance tracking
    uint256 public totalTransactionsProcessed;
    uint256 public totalGasUsed;
    uint256 public averageExecutionTime;
    uint256 public successRate; // in basis points (10000 = 100%)

    // Events
    event TransactionOrchestrated(uint256 indexed transactionId, address indexed user, address target, RateLimiter.Priority priority);
    event TransactionExecuted(uint256 indexed transactionId, address indexed user, bool success, uint256 gasUsed, uint256 executionTime);
    event BatchExecuted(uint256[] transactionIds, uint256 totalGasUsed, uint256 batchSize);
    event OrchestratorFeeCollected(uint256 amount, address indexed collector);
    event PerformanceUpdated(uint256 totalProcessed, uint256 totalGas, uint256 avgExecutionTime, uint256 successRate);

    // Errors
    error GasFeeManagerNotSet();
    error RateLimiterNotSet();
    error TransactionNotFound();
    error TransactionAlreadyExecuted();
    error TransactionExpired();
    error ExecutionTimeoutExceeded();
    error InvalidBatchSize();
    error InsufficientGasFees();
    error RateLimitExceeded();
    error ExecutionIntervalTooShort();

    /**
     * @dev Constructor
     * @param _gasFeeManager Address of the GasFeeManager contract
     * @param _rateLimiter Address of the RateLimiter contract
     * @param _orchestratorFeeCollector Address to collect orchestrator fees
     * @param _admin Admin address
     */
    constructor(
        address payable _gasFeeManager,
        address _rateLimiter,
        address _orchestratorFeeCollector,
        address _admin
    ) {
        require(_gasFeeManager != address(0), "Invalid gas fee manager");
        require(_rateLimiter != address(0), "Invalid rate limiter");
        require(_orchestratorFeeCollector != address(0), "Invalid fee collector");
        require(_admin != address(0), "Invalid admin");

        gasFeeManager = GasFeeManager(_gasFeeManager);
        rateLimiter = RateLimiter(_rateLimiter);
        orchestratorFeeCollector = _orchestratorFeeCollector;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
        _grantRole(EXECUTOR_ROLE, _admin);
        _grantRole(ORCHESTRATOR_ROLE, _admin);

        lastExecutionTime = block.timestamp;
    }

    /**
     * @dev Orchestrate a transaction with gas fee management and rate limiting
     * @param target Target contract address
     * @param value ETH value to send
     * @param data Transaction data
     * @param gasLimit Gas limit for the transaction
     * @param maxFeePerGas Maximum fee per gas
     * @param maxPriorityFeePerGas Maximum priority fee per gas
     * @param tokenAddress Token to use for gas fees (address(0) for native)
     * @param tokenAmount Amount of tokens to use for gas fees
     * @param priority Priority level for rate limiting
     */
    function orchestrateTransaction(
        address target,
        uint256 value,
        bytes calldata data,
        uint256 gasLimit,
        uint256 maxFeePerGas,
        uint256 maxPriorityFeePerGas,
        address tokenAddress,
        uint256 tokenAmount,
        RateLimiter.Priority priority
    ) external nonReentrant whenNotPaused returns (uint256 transactionId) {
        require(target != address(0), "Invalid target address");
        require(gasLimit > 0, "Invalid gas limit");
        require(maxFeePerGas > 0, "Invalid max fee per gas");
        require(tokenAmount > 0, "Invalid token amount");

        // Check if user has sufficient balance in GasFeeManager
        uint256 userBalance = gasFeeManager.getUserBalance(msg.sender, tokenAddress);
        require(userBalance >= tokenAmount, "Insufficient balance in gas fee manager");

        // Check rate limits
        require(rateLimiter.canQueueTransaction(msg.sender, gasLimit), "Rate limit exceeded");

        // Create transaction ID
        transactionId = _transactionCounter;
        _transactionCounter++;

        // Create orchestrated transaction
        orchestratedTransactions[transactionId] = OrchestratedTransaction({
            id: transactionId,
            user: msg.sender,
            target: target,
            value: value,
            data: data,
            gasLimit: gasLimit,
            maxFeePerGas: maxFeePerGas,
            maxPriorityFeePerGas: maxPriorityFeePerGas,
            tokenAddress: tokenAddress,
            tokenAmount: tokenAmount,
            priority: priority,
            gasFeesPaid: false,
            rateLimitChecked: true,
            executed: false,
            failed: false,
            failureReason: "",
            timestamp: block.timestamp,
            executionTime: 0
        });

        // Add to user's transaction list
        userTransactions[msg.sender].push(transactionId);

        // Add to priority execution queue
        priorityExecutionQueue[priority].push(transactionId);

        emit TransactionOrchestrated(transactionId, msg.sender, target, priority);
    }

    /**
     * @dev Execute a single transaction
     * @param transactionId ID of the transaction to execute
     */
    function executeTransaction(uint256 transactionId) external nonReentrant onlyRole(EXECUTOR_ROLE) {
        OrchestratedTransaction storage transaction = orchestratedTransactions[transactionId];
        require(transaction.user != address(0), "Transaction not found");
        require(!transaction.executed, "Transaction already executed");
        require(block.timestamp - transaction.timestamp <= executionTimeout, "Transaction expired");
        require(block.timestamp - lastExecutionTime >= minExecutionInterval, "Execution interval too short");

        uint256 executionStartTime = block.timestamp;

        // Pay gas fees through GasFeeManager
        _payGasFees(transaction);

        // Execute the transaction
        bool success = _executeOrchestratedTransaction(transaction);

        // Update transaction status
        transaction.executed = true;
        transaction.executionTime = block.timestamp - executionStartTime;
        transaction.failed = !success;

        if (!success) {
            transaction.failureReason = "Transaction execution failed";
        }

        // Update performance metrics
        _updatePerformanceMetrics(transaction.executionTime, success);

        // Remove from priority queue
        _removeFromPriorityQueue(transaction.priority, transactionId);

        lastExecutionTime = block.timestamp;

        emit TransactionExecuted(transactionId, transaction.user, success, transaction.gasLimit, transaction.executionTime);
    }

    /**
     * @dev Execute multiple transactions in a batch
     * @param transactionIds Array of transaction IDs to execute
     */
    function executeBatch(uint256[] calldata transactionIds) external nonReentrant onlyRole(EXECUTOR_ROLE) {
        require(transactionIds.length <= maxBatchSize, "Batch size too large");
        require(transactionIds.length > 0, "Empty batch");
        require(block.timestamp - lastExecutionTime >= minExecutionInterval, "Execution interval too short");

        uint256 totalGasUsed = 0;
        uint256 successfulExecutions = 0;
        uint256 batchStartTime = block.timestamp;

        for (uint256 i = 0; i < transactionIds.length; i++) {
            uint256 transactionId = transactionIds[i];
            OrchestratedTransaction storage transaction = orchestratedTransactions[transactionId];
            
            if (transaction.user == address(0) || transaction.executed || 
                block.timestamp - transaction.timestamp > executionTimeout) {
                continue;
            }

            uint256 executionStartTime = block.timestamp;

            // Pay gas fees
            _payGasFees(transaction);

            // Execute transaction
            bool success = _executeOrchestratedTransaction(transaction);

            // Update transaction status
            transaction.executed = true;
            transaction.executionTime = block.timestamp - executionStartTime;
            transaction.failed = !success;

            if (success) {
                successfulExecutions++;
            } else {
                transaction.failureReason = "Batch execution failed";
            }

            totalGasUsed += transaction.gasLimit;

            // Remove from priority queue
            _removeFromPriorityQueue(transaction.priority, transactionId);
        }

        // Update performance metrics
        uint256 batchExecutionTime = block.timestamp - batchStartTime;
        _updateBatchPerformanceMetrics(batchExecutionTime, successfulExecutions, transactionIds.length);

        lastExecutionTime = block.timestamp;

        emit BatchExecuted(transactionIds, totalGasUsed, transactionIds.length);
    }

    /**
     * @dev Execute next transaction from priority queue
     */
    function executeNextTransaction() external nonReentrant onlyRole(EXECUTOR_ROLE) returns (uint256 transactionId) {
        // Find highest priority transaction
        for (uint256 priority = uint256(RateLimiter.Priority.CRITICAL); priority >= uint256(RateLimiter.Priority.LOW); priority--) {
            if (priorityExecutionQueue[RateLimiter.Priority(priority)].length > 0) {
                transactionId = _executeFromPriorityQueue(RateLimiter.Priority(priority));
                if (transactionId != 0) {
                    return transactionId;
                }
            }
        }
        
        revert("No transactions to execute");
    }

    /**
     * @dev Get transaction details
     * @param transactionId ID of the transaction
     */
    function getTransaction(uint256 transactionId) external view returns (OrchestratedTransaction memory) {
        return orchestratedTransactions[transactionId];
    }

    /**
     * @dev Get user's transactions
     * @param user User address
     */
    function getUserTransactions(address user) external view returns (uint256[] memory) {
        return userTransactions[user];
    }

    /**
     * @dev Get queue statistics
     */
    function getQueueStats() external view returns (
        uint256 totalQueued,
        uint256 lowPriority,
        uint256 normalPriority,
        uint256 highPriority,
        uint256 urgentPriority,
        uint256 criticalPriority
    ) {
        totalQueued = _transactionCounter;
        lowPriority = priorityExecutionQueue[RateLimiter.Priority.LOW].length;
        normalPriority = priorityExecutionQueue[RateLimiter.Priority.NORMAL].length;
        highPriority = priorityExecutionQueue[RateLimiter.Priority.HIGH].length;
        urgentPriority = priorityExecutionQueue[RateLimiter.Priority.URGENT].length;
        criticalPriority = priorityExecutionQueue[RateLimiter.Priority.CRITICAL].length;
    }

    /**
     * @dev Get performance metrics
     */
    function getPerformanceMetrics() external view returns (
        uint256 totalProcessed,
        uint256 totalGas,
        uint256 avgExecutionTime,
        uint256 successRateBps
    ) {
        return (totalTransactionsProcessed, totalGasUsed, averageExecutionTime, successRate);
    }

    /**
     * @dev Update configuration (admin only)
     * @param _maxBatchSize Maximum batch size
     * @param _executionTimeout Execution timeout in seconds
     * @param _minExecutionInterval Minimum execution interval in seconds
     * @param _orchestratorFeePercentage Orchestrator fee percentage in basis points
     */
    function updateConfiguration(
        uint256 _maxBatchSize,
        uint256 _executionTimeout,
        uint256 _minExecutionInterval,
        uint256 _orchestratorFeePercentage
    ) external onlyRole(ADMIN_ROLE) {
        require(_maxBatchSize > 0, "Invalid batch size");
        require(_executionTimeout > 0, "Invalid timeout");
        require(_orchestratorFeePercentage <= 1000, "Fee too high"); // Max 10%

        maxBatchSize = _maxBatchSize;
        executionTimeout = _executionTimeout;
        minExecutionInterval = _minExecutionInterval;
        orchestratorFeePercentage = _orchestratorFeePercentage;
    }

    /**
     * @dev Update orchestrator fee collector (admin only)
     * @param _feeCollector New fee collector address
     */
    function updateFeeCollector(address _feeCollector) external onlyRole(ADMIN_ROLE) {
        require(_feeCollector != address(0), "Invalid fee collector");
        orchestratorFeeCollector = _feeCollector;
    }

    /**
     * @dev Pause contract (admin only)
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause contract (admin only)
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    // Internal functions

    /**
     * @dev Pay gas fees through GasFeeManager
     * @param transaction Transaction to pay fees for
     */
    function _payGasFees(OrchestratedTransaction storage transaction) internal {
        if (transaction.gasFeesPaid) {
            return;
        }

        // Calculate orchestrator fee
        uint256 orchestratorFee = (transaction.tokenAmount * orchestratorFeePercentage) / 10000;
        uint256 gasFeeAmount = transaction.tokenAmount - orchestratorFee;

        // Pay orchestrator fee
        if (orchestratorFee > 0) {
            if (transaction.tokenAddress == address(0)) {
                (bool success, ) = payable(orchestratorFeeCollector).call{value: orchestratorFee}("");
                require(success, "Orchestrator fee transfer failed");
            } else {
                IERC20(transaction.tokenAddress).safeTransfer(orchestratorFeeCollector, orchestratorFee);
            }
            emit OrchestratorFeeCollected(orchestratorFee, orchestratorFeeCollector);
        }

        // Request transaction through GasFeeManager
        gasFeeManager.requestTransaction(
            transaction.target,
            transaction.value,
            transaction.data,
            transaction.gasLimit,
            transaction.maxFeePerGas,
            transaction.maxPriorityFeePerGas,
            transaction.tokenAddress,
            gasFeeAmount
        );

        transaction.gasFeesPaid = true;
    }

    /**
     * @dev Execute an orchestrated transaction
     * @param transaction Transaction to execute
     */
    function _executeOrchestratedTransaction(OrchestratedTransaction storage transaction) internal returns (bool) {
        // This is a placeholder for actual transaction execution
        // In a real implementation, this would coordinate with GasFeeManager and RateLimiter
        
        // Simulate execution success (90% success rate for demo)
        uint256 randomValue = uint256(keccak256(abi.encodePacked(block.timestamp, transaction.id))) % 100;
        return randomValue < 90;
    }

    /**
     * @dev Execute transaction from priority queue
     * @param priority Priority level
     */
    function _executeFromPriorityQueue(RateLimiter.Priority priority) internal returns (uint256 transactionId) {
        uint256[] storage queue = priorityExecutionQueue[priority];
        
        for (uint256 i = 0; i < queue.length; i++) {
            transactionId = queue[i];
            OrchestratedTransaction storage transaction = orchestratedTransactions[transactionId];
            
            if (transaction.executed || block.timestamp - transaction.timestamp > executionTimeout) {
                continue;
            }

            uint256 executionStartTime = block.timestamp;

            // Pay gas fees
            _payGasFees(transaction);

            // Execute transaction
            bool success = _executeOrchestratedTransaction(transaction);

            // Update transaction status
            transaction.executed = true;
            transaction.executionTime = block.timestamp - executionStartTime;
            transaction.failed = !success;

            // Update performance metrics
            _updatePerformanceMetrics(transaction.executionTime, success);

            // Remove from queue
            _removeFromPriorityQueueByIndex(priority, i);

            emit TransactionExecuted(transactionId, transaction.user, success, transaction.gasLimit, transaction.executionTime);
            return transactionId;
        }
        
        return 0;
    }

    /**
     * @dev Update performance metrics
     * @param executionTime Execution time in seconds
     * @param success Whether the transaction was successful
     */
    function _updatePerformanceMetrics(uint256 executionTime, bool success) internal {
        totalTransactionsProcessed++;
        totalGasUsed += 100000; // Simulated gas usage

        // Update average execution time
        averageExecutionTime = ((averageExecutionTime * (totalTransactionsProcessed - 1)) + executionTime) / totalTransactionsProcessed;

        // Update success rate
        uint256 successfulTransactions = (successRate * (totalTransactionsProcessed - 1)) / 10000;
        if (success) {
            successfulTransactions++;
        }
        successRate = (successfulTransactions * 10000) / totalTransactionsProcessed;

        emit PerformanceUpdated(totalTransactionsProcessed, totalGasUsed, averageExecutionTime, successRate);
    }

    /**
     * @dev Update batch performance metrics
     * @param batchExecutionTime Total batch execution time
     * @param successfulExecutions Number of successful executions
     * @param totalExecutions Total number of executions
     */
    function _updateBatchPerformanceMetrics(
        uint256 batchExecutionTime,
        uint256 successfulExecutions,
        uint256 totalExecutions
    ) internal {
        totalTransactionsProcessed += totalExecutions;
        totalGasUsed += totalExecutions * 100000; // Simulated gas usage

        // Update average execution time
        uint256 avgExecutionTime = batchExecutionTime / totalExecutions;
        averageExecutionTime = ((averageExecutionTime * (totalTransactionsProcessed - totalExecutions)) + (avgExecutionTime * totalExecutions)) / totalTransactionsProcessed;

        // Update success rate
        uint256 previousSuccessful = (successRate * (totalTransactionsProcessed - totalExecutions)) / 10000;
        uint256 totalSuccessful = previousSuccessful + successfulExecutions;
        successRate = (totalSuccessful * 10000) / totalTransactionsProcessed;

        emit PerformanceUpdated(totalTransactionsProcessed, totalGasUsed, averageExecutionTime, successRate);
    }

    /**
     * @dev Remove transaction from priority queue
     * @param priority Priority level
     * @param transactionId Transaction ID to remove
     */
    function _removeFromPriorityQueue(RateLimiter.Priority priority, uint256 transactionId) internal {
        uint256[] storage queue = priorityExecutionQueue[priority];
        
        for (uint256 i = 0; i < queue.length; i++) {
            if (queue[i] == transactionId) {
                _removeFromPriorityQueueByIndex(priority, i);
                break;
            }
        }
    }

    /**
     * @dev Remove transaction from priority queue by index
     * @param priority Priority level
     * @param index Index to remove
     */
    function _removeFromPriorityQueueByIndex(RateLimiter.Priority priority, uint256 index) internal {
        uint256[] storage queue = priorityExecutionQueue[priority];
        
        if (index >= queue.length) {
            return;
        }

        // Move last element to the position being deleted
        queue[index] = queue[queue.length - 1];
        queue.pop();
    }

    /**
     * @dev Get queue length for a priority level
     * @param priority Priority level
     */
    function getQueueLength(RateLimiter.Priority priority) external view returns (uint256) {
        return priorityExecutionQueue[priority].length;
    }

    /**
     * @dev Check if transaction can be orchestrated
     * @param user User address
     * @param gasLimit Gas limit for the transaction
     * @param tokenAmount Token amount for gas fees
     * @param tokenAddress Token address for gas fees
     */
    function canOrchestrateTransaction(
        address user,
        uint256 gasLimit,
        uint256 tokenAmount,
        address tokenAddress
    ) external view returns (bool) {
        // Check if user has sufficient balance
        uint256 userBalance = gasFeeManager.getUserBalance(user, tokenAddress);
        if (userBalance < tokenAmount) {
            return false;
        }

        // Check rate limits
        return rateLimiter.canQueueTransaction(user, gasLimit);
    }

    /**
     * @dev Get estimated execution time for a priority level
     * @param priority Priority level
     */
    function getEstimatedExecutionTime(RateLimiter.Priority priority) external view returns (uint256) {
        uint256 queueLength = priorityExecutionQueue[priority].length;
        return queueLength * minExecutionInterval;
    }

    // Receive function to accept native tokens
    receive() external payable {
        // Allow receiving native tokens
    }
}
