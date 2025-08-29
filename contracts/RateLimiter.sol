// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
// Counters removed for OpenZeppelin v5 compatibility

/**
 * @title RateLimiter
 * @dev Contract for managing transaction rate limiting and throughput control
 * @dev Allows platform to efficiently manage transaction execution with local node
 * @dev Supports multiple rate limiting strategies and priority queues
 */
contract RateLimiter is AccessControl, ReentrancyGuard, Pausable {
    // Counters usage removed for OpenZeppelin v5 compatibility

    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant RATE_MANAGER_ROLE = keccak256("RATE_MANAGER_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");

    // Rate limiting configuration
    struct RateLimit {
        uint256 maxTransactionsPerSecond;
        uint256 maxTransactionsPerMinute;
        uint256 maxTransactionsPerHour;
        uint256 maxGasPerSecond;
        uint256 maxGasPerMinute;
        uint256 maxGasPerHour;
        bool isActive;
    }

    // Transaction queue item
    struct QueuedTransaction {
        uint256 id;
        address user;
        address target;
        uint256 gasLimit;
        uint256 priority;
        uint256 timestamp;
        bool executed;
        bool cancelled;
        string reason;
    }

    // User rate tracking
    struct UserRate {
        uint256 lastTransactionTime;
        uint256 transactionsThisSecond;
        uint256 transactionsThisMinute;
        uint256 transactionsThisHour;
        uint256 gasUsedThisSecond;
        uint256 gasUsedThisMinute;
        uint256 gasUsedThisHour;
        uint256 totalTransactions;
        uint256 totalGasUsed;
    }

    // Priority levels
    enum Priority {
        LOW,        // 0 - Standard transactions
        NORMAL,     // 1 - Regular priority
        HIGH,       // 2 - High priority
        URGENT,     // 3 - Urgent transactions
        CRITICAL    // 4 - Critical system transactions
    }

    // State variables
    mapping(uint256 => RateLimit) public rateLimits;
    mapping(address => UserRate) public userRates;
    mapping(uint256 => QueuedTransaction) public queuedTransactions;
    mapping(Priority => uint256[]) public priorityQueues;
    
    uint256 private _transactionCounter;
    
    // Rate limiting settings
    uint256 public globalMaxTransactionsPerSecond = 100;
    uint256 public globalMaxGasPerSecond = 50000000; // 50M gas per second
    uint256 public minPriorityFee = 1000000000; // 1 gwei
    uint256 public maxPriorityFee = 100000000000; // 100 gwei
    
    // Queue management
    uint256 public maxQueueSize = 10000;
    uint256 public queueTimeout = 3600; // 1 hour
    uint256 public lastCleanupTime;
    
    // Network-specific settings
    mapping(uint256 => bool) public supportedNetworks;
    mapping(uint256 => uint256) public networkRateMultipliers;

    // Events
    event TransactionQueued(uint256 indexed transactionId, address indexed user, address target, Priority priority);
    event TransactionExecuted(uint256 indexed transactionId, address indexed user, bool success, uint256 gasUsed);
    event TransactionCancelled(uint256 indexed transactionId, address indexed user, string reason);
    event RateLimitUpdated(uint256 indexed networkId, uint256 maxTps, uint256 maxGasPerSecond);
    event PriorityQueueUpdated(Priority indexed priority, uint256 queueLength);
    event UserRateReset(address indexed user, uint256 timestamp);
    event QueueCleanup(uint256 cleanedTransactions, uint256 timestamp);

    // Errors
    error RateLimitExceeded();
    error QueueFull();
    error TransactionNotFound();
    error TransactionAlreadyExecuted();
    error TransactionExpired();
    error InvalidPriority();
    error InvalidNetwork();
    error InsufficientPriorityFee();
    error QueueTimeoutExceeded();

    /**
     * @dev Constructor
     * @param _admin Admin address
     */
    constructor(address _admin) {
        require(_admin != address(0), "Invalid admin address");

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
        _grantRole(RATE_MANAGER_ROLE, _admin);
        _grantRole(EXECUTOR_ROLE, _admin);

        // Initialize default rate limits for common networks
        _initializeDefaultRateLimits();
        
        lastCleanupTime = block.timestamp;
    }

    /**
     * @dev Initialize default rate limits for supported networks
     */
    function _initializeDefaultRateLimits() internal {
        // Ethereum Mainnet (Chain ID: 1)
        rateLimits[1] = RateLimit({
            maxTransactionsPerSecond: 50,
            maxTransactionsPerMinute: 3000,
            maxTransactionsPerHour: 180000,
            maxGasPerSecond: 30000000, // 30M gas per second
            maxGasPerMinute: 1800000000, // 1.8B gas per minute
            maxGasPerHour: 108000000000, // 108B gas per hour
            isActive: true
        });

        // Sepolia Testnet (Chain ID: 11155111)
        rateLimits[11155111] = RateLimit({
            maxTransactionsPerSecond: 100,
            maxTransactionsPerMinute: 6000,
            maxTransactionsPerHour: 360000,
            maxGasPerSecond: 50000000, // 50M gas per second
            maxGasPerMinute: 3000000000, // 3B gas per minute
            maxGasPerHour: 180000000000, // 180B gas per hour
            isActive: true
        });

        // Alkebuleum (Chain ID: 1337)
        rateLimits[1337] = RateLimit({
            maxTransactionsPerSecond: 200,
            maxTransactionsPerMinute: 12000,
            maxTransactionsPerHour: 720000,
            maxGasPerSecond: 100000000, // 100M gas per second
            maxGasPerMinute: 6000000000, // 6B gas per minute
            maxGasPerHour: 360000000000, // 360B gas per hour
            isActive: true
        });

        // Mark networks as supported
        supportedNetworks[1] = true;
        supportedNetworks[11155111] = true;
        supportedNetworks[1337] = true;

        // Set network rate multipliers
        networkRateMultipliers[1] = 100; // 100% (base)
        networkRateMultipliers[11155111] = 150; // 150% (testnet)
        networkRateMultipliers[1337] = 200; // 200% (Alkebuleum)
    }

    /**
     * @dev Queue a transaction for execution
     * @param target Target contract address
     * @param gasLimit Gas limit for the transaction
     * @param priority Priority level
     * @param priorityFee Priority fee in wei
     */
    function queueTransaction(
        address target,
        uint256 gasLimit,
        Priority priority,
        uint256 priorityFee
    ) external nonReentrant whenNotPaused returns (uint256 transactionId) {
        require(target != address(0), "Invalid target address");
        require(gasLimit > 0, "Invalid gas limit");
        require(priority <= Priority.CRITICAL, "Invalid priority level");
        require(priorityFee >= minPriorityFee, "Priority fee too low");
        require(priorityFee <= maxPriorityFee, "Priority fee too high");
        require(supportedNetworks[block.chainid], "Network not supported");

        // Check if queue is full
        if (_transactionCounter >= maxQueueSize) {
            revert QueueFull();
        }

        // Check rate limits
        _checkRateLimits(msg.sender, gasLimit);

        // Create transaction ID
        transactionId = _transactionCounter;
        _transactionCounter++;

        // Add to queue
        queuedTransactions[transactionId] = QueuedTransaction({
            id: transactionId,
            user: msg.sender,
            target: target,
            gasLimit: gasLimit,
            priority: uint256(priority),
            timestamp: block.timestamp,
            executed: false,
            cancelled: false,
            reason: ""
        });

        // Add to priority queue
        priorityQueues[priority].push(transactionId);

        // Update user rate tracking
        _updateUserRate(msg.sender, gasLimit);

        emit TransactionQueued(transactionId, msg.sender, target, priority);
        emit PriorityQueueUpdated(priority, priorityQueues[priority].length);
    }

    /**
     * @dev Execute next transaction from priority queue
     * @param maxGas Maximum gas to use for execution
     */
    function executeNextTransaction(uint256 maxGas) external nonReentrant onlyRole(EXECUTOR_ROLE) returns (uint256 transactionId) {
        // Find highest priority transaction
        for (uint256 priority = uint256(Priority.CRITICAL); priority >= uint256(Priority.LOW); priority--) {
            if (priorityQueues[Priority(priority)].length > 0) {
                transactionId = _executeFromQueue(Priority(priority), maxGas);
                if (transactionId != 0) {
                    return transactionId;
                }
            }
        }
        
        revert("No transactions to execute");
    }

    /**
     * @dev Execute specific transaction by ID
     * @param transactionId ID of the transaction to execute
     * @param maxGas Maximum gas to use for execution
     */
    function executeTransaction(uint256 transactionId, uint256 maxGas) external nonReentrant onlyRole(EXECUTOR_ROLE) {
        QueuedTransaction storage transaction = queuedTransactions[transactionId];
        require(transaction.user != address(0), "Transaction not found");
        require(!transaction.executed, "Transaction already executed");
        require(!transaction.cancelled, "Transaction cancelled");
        require(block.timestamp - transaction.timestamp <= queueTimeout, "Transaction expired");

        // Execute the transaction
        bool success = _executeTransaction(transaction, maxGas);
        
        // Mark as executed
        transaction.executed = true;
        
        // Remove from priority queue
        _removeFromPriorityQueue(Priority(transaction.priority), transactionId);

        emit TransactionExecuted(transactionId, transaction.user, success, transaction.gasLimit);
    }

    /**
     * @dev Cancel a queued transaction
     * @param transactionId ID of the transaction to cancel
     * @param reason Reason for cancellation
     */
    function cancelTransaction(uint256 transactionId, string memory reason) external {
        QueuedTransaction storage transaction = queuedTransactions[transactionId];
        require(transaction.user != address(0), "Transaction not found");
        require(!transaction.executed, "Transaction already executed");
        require(!transaction.cancelled, "Transaction already cancelled");
        require(msg.sender == transaction.user || hasRole(ADMIN_ROLE, msg.sender), "Not authorized");

        transaction.cancelled = true;
        transaction.reason = reason;

        // Remove from priority queue
        _removeFromPriorityQueue(Priority(transaction.priority), transactionId);

        emit TransactionCancelled(transactionId, transaction.user, reason);
    }

    /**
     * @dev Get next transaction from priority queue
     * @param priority Priority level to check
     */
    function getNextTransaction(Priority priority) external view returns (uint256 transactionId) {
        if (priorityQueues[priority].length > 0) {
            transactionId = priorityQueues[priority][0];
            
            // Check if transaction is still valid
            QueuedTransaction storage transaction = queuedTransactions[transactionId];
            if (transaction.executed || transaction.cancelled || 
                block.timestamp - transaction.timestamp > queueTimeout) {
                return 0;
            }
        }
        return 0;
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
        lowPriority = priorityQueues[Priority.LOW].length;
        normalPriority = priorityQueues[Priority.NORMAL].length;
        highPriority = priorityQueues[Priority.HIGH].length;
        urgentPriority = priorityQueues[Priority.URGENT].length;
        criticalPriority = priorityQueues[Priority.CRITICAL].length;
    }

    /**
     * @dev Get user rate information
     * @param user User address
     */
    function getUserRate(address user) external view returns (UserRate memory) {
        return userRates[user];
    }

    /**
     * @dev Get rate limit for a network
     * @param networkId Network chain ID
     */
    function getRateLimit(uint256 networkId) external view returns (RateLimit memory) {
        return rateLimits[networkId];
    }

    /**
     * @dev Clean up expired transactions
     */
    function cleanupExpiredTransactions() external onlyRole(OPERATOR_ROLE) {
        uint256 cleanedCount = 0;
        uint256 currentTime = block.timestamp;

        for (uint256 priority = uint256(Priority.LOW); priority <= uint256(Priority.CRITICAL); priority++) {
            uint256[] storage queue = priorityQueues[Priority(priority)];
            
            for (int256 i = int256(queue.length) - 1; i >= 0; i--) {
                uint256 transactionId = queue[uint256(i)];
                QueuedTransaction storage transaction = queuedTransactions[transactionId];
                
                if (currentTime - transaction.timestamp > queueTimeout) {
                    // Mark as cancelled
                    transaction.cancelled = true;
                    transaction.reason = "Expired";
                    
                    // Remove from queue
                    _removeFromPriorityQueueByIndex(Priority(priority), uint256(i));
                    cleanedCount++;
                }
            }
        }

        lastCleanupTime = currentTime;
        emit QueueCleanup(cleanedCount, currentTime);
    }

    /**
     * @dev Reset user rate tracking
     * @param user User address
     */
    function resetUserRate(address user) external onlyRole(RATE_MANAGER_ROLE) {
        UserRate storage userRate = userRates[user];
        userRate.lastTransactionTime = 0;
        userRate.transactionsThisSecond = 0;
        userRate.transactionsThisMinute = 0;
        userRate.transactionsThisHour = 0;
        userRate.gasUsedThisSecond = 0;
        userRate.gasUsedThisMinute = 0;
        userRate.gasUsedThisHour = 0;

        emit UserRateReset(user, block.timestamp);
    }

    /**
     * @dev Update rate limits for a network (admin only)
     * @param networkId Network chain ID
     * @param maxTps Max transactions per second
     * @param maxTpm Max transactions per minute
     * @param maxTph Max transactions per hour
     * @param maxGasPerSecond Max gas per second
     * @param maxGasPerMinute Max gas per minute
     * @param maxGasPerHour Max gas per hour
     * @param isActive Whether the rate limit is active
     */
    function updateRateLimit(
        uint256 networkId,
        uint256 maxTps,
        uint256 maxTpm,
        uint256 maxTph,
        uint256 maxGasPerSecond,
        uint256 maxGasPerMinute,
        uint256 maxGasPerHour,
        bool isActive
    ) external onlyRole(ADMIN_ROLE) {
        rateLimits[networkId] = RateLimit({
            maxTransactionsPerSecond: maxTps,
            maxTransactionsPerMinute: maxTpm,
            maxTransactionsPerHour: maxTph,
            maxGasPerSecond: maxGasPerSecond,
            maxGasPerMinute: maxGasPerMinute,
            maxGasPerHour: maxGasPerHour,
            isActive: isActive
        });

        supportedNetworks[networkId] = isActive;
        emit RateLimitUpdated(networkId, maxTps, maxGasPerSecond);
    }

    /**
     * @dev Update global rate limiting settings
     * @param maxTps Global max transactions per second
     * @param maxGasPerSecond Global max gas per second
     * @param maxQueueSize Maximum queue size
     * @param queueTimeout Queue timeout in seconds
     */
    function updateGlobalSettings(
        uint256 maxTps,
        uint256 maxGasPerSecond,
        uint256 maxQueueSize,
        uint256 queueTimeout
    ) external onlyRole(ADMIN_ROLE) {
        globalMaxTransactionsPerSecond = maxTps;
        globalMaxGasPerSecond = maxGasPerSecond;
        maxQueueSize = maxQueueSize;
        queueTimeout = queueTimeout;
    }

    /**
     * @dev Update priority fee limits
     * @param minFee Minimum priority fee
     * @param maxFee Maximum priority fee
     */
    function updatePriorityFeeLimits(uint256 minFee, uint256 maxFee) external onlyRole(ADMIN_ROLE) {
        require(minFee < maxFee, "Invalid fee range");
        minPriorityFee = minFee;
        maxPriorityFee = maxFee;
    }

    /**
     * @dev Add or remove supported network
     * @param networkId Network chain ID
     * @param supported Whether the network is supported
     * @param multiplier Rate multiplier for the network
     */
    function updateSupportedNetwork(uint256 networkId, bool supported, uint256 multiplier) external onlyRole(ADMIN_ROLE) {
        supportedNetworks[networkId] = supported;
        if (supported) {
            networkRateMultipliers[networkId] = multiplier;
        }
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
     * @dev Check rate limits for a user
     * @param user User address
     * @param gasLimit Gas limit for the transaction
     */
    function _checkRateLimits(address user, uint256 gasLimit) internal view {
        UserRate storage userRate = userRates[user];
        RateLimit storage networkRateLimit = rateLimits[block.chainid];
        
        if (!networkRateLimit.isActive) {
            return;
        }

        // Check global limits
        if (userRate.transactionsThisSecond >= globalMaxTransactionsPerSecond) {
            revert RateLimitExceeded();
        }
        if (userRate.gasUsedThisSecond >= globalMaxGasPerSecond) {
            revert RateLimitExceeded();
        }

        // Check network-specific limits
        if (userRate.transactionsThisSecond >= networkRateLimit.maxTransactionsPerSecond) {
            revert RateLimitExceeded();
        }
        if (userRate.gasUsedThisSecond + gasLimit >= networkRateLimit.maxGasPerSecond) {
            revert RateLimitExceeded();
        }
    }

    /**
     * @dev Update user rate tracking
     * @param user User address
     * @param gasLimit Gas limit used
     */
    function _updateUserRate(address user, uint256 gasLimit) internal {
        UserRate storage userRate = userRates[user];
        uint256 currentTime = block.timestamp;

        // Reset counters if time period has passed
        if (currentTime - userRate.lastTransactionTime >= 1) {
            userRate.transactionsThisSecond = 0;
            userRate.gasUsedThisSecond = 0;
        }
        if (currentTime - userRate.lastTransactionTime >= 60) {
            userRate.transactionsThisMinute = 0;
            userRate.gasUsedThisMinute = 0;
        }
        if (currentTime - userRate.lastTransactionTime >= 3600) {
            userRate.transactionsThisHour = 0;
            userRate.gasUsedThisHour = 0;
        }

        // Update counters
        userRate.lastTransactionTime = currentTime;
        userRate.transactionsThisSecond++;
        userRate.transactionsThisMinute++;
        userRate.transactionsThisHour++;
        userRate.gasUsedThisSecond += gasLimit;
        userRate.gasUsedThisMinute += gasLimit;
        userRate.gasUsedThisHour += gasLimit;
        userRate.totalTransactions++;
        userRate.totalGasUsed += gasLimit;
    }

    /**
     * @dev Execute transaction from queue
     * @param priority Priority level
     * @param maxGas Maximum gas to use
     */
    function _executeFromQueue(Priority priority, uint256 maxGas) internal returns (uint256 transactionId) {
        uint256[] storage queue = priorityQueues[priority];
        
        for (uint256 i = 0; i < queue.length; i++) {
            transactionId = queue[i];
            QueuedTransaction storage transaction = queuedTransactions[transactionId];
            
            // Skip if already executed, cancelled, or expired
            if (transaction.executed || transaction.cancelled || 
                block.timestamp - transaction.timestamp > queueTimeout) {
                continue;
            }

            // Execute the transaction
            bool success = _executeTransaction(transaction, maxGas);
            
            // Mark as executed
            transaction.executed = true;
            
            // Remove from queue
            _removeFromPriorityQueueByIndex(priority, i);

            emit TransactionExecuted(transactionId, transaction.user, success, transaction.gasLimit);
            return transactionId;
        }
        
        return 0;
    }

    /**
     * @dev Execute a transaction (placeholder for actual execution logic)
     * @param transaction Transaction to execute
     * @param maxGas Maximum gas to use
     */
    function _executeTransaction(QueuedTransaction storage transaction, uint256 maxGas) internal returns (bool) {
        // This is a placeholder for actual transaction execution
        // In a real implementation, this would call the target contract
        // For now, we just return true to simulate successful execution
        
        require(transaction.gasLimit <= maxGas, "Gas limit exceeds maximum");
        
        // Simulate execution delay
        // In practice, this would be the actual contract call
        return true;
    }

    /**
     * @dev Remove transaction from priority queue
     * @param priority Priority level
     * @param transactionId Transaction ID to remove
     */
    function _removeFromPriorityQueue(Priority priority, uint256 transactionId) internal {
        uint256[] storage queue = priorityQueues[priority];
        
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
    function _removeFromPriorityQueueByIndex(Priority priority, uint256 index) internal {
        uint256[] storage queue = priorityQueues[priority];
        
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
    function getQueueLength(Priority priority) external view returns (uint256) {
        return priorityQueues[priority].length;
    }

    /**
     * @dev Check if user can queue a transaction
     * @param user User address
     * @param gasLimit Gas limit for the transaction
     */
    function canQueueTransaction(address user, uint256 gasLimit) external view returns (bool) {
        // Check if queue is not full
        if (_transactionCounter >= maxQueueSize) {
            return false;
        }
        
        // Check global gas limit
        if (gasLimit > globalMaxGasPerSecond) {
            return false;
        }
        
        // For now, return true if basic checks pass
        // In a full implementation, we'd check user-specific rates
        return true;
    }

    /**
     * @dev Get estimated wait time for a priority level
     * @param priority Priority level
     */
    function getEstimatedWaitTime(Priority priority) external view returns (uint256) {
        uint256 queueLength = priorityQueues[priority].length;
        RateLimit storage networkRateLimit = rateLimits[block.chainid];
        
        if (networkRateLimit.isActive) {
            return queueLength / networkRateLimit.maxTransactionsPerSecond;
        }
        
        return queueLength / globalMaxTransactionsPerSecond;
    }
}
