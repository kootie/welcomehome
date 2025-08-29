// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// Counters removed for OpenZeppelin v5 compatibility
import "@openzeppelin/contracts/utils/Address.sol";

/**
 * @title GasFeeManager
 * @dev Contract for managing gas fees and token transactions across networks
 * @dev Supports both Alkebuleum and Sepolia networks
 * @dev Allows users to deposit tokens and pay for gas fees through the contract
 */
contract GasFeeManager is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    // Counters usage removed for OpenZeppelin v5 compatibility
    using Address for address payable;

    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant GAS_PROVIDER_ROLE = keccak256("GAS_PROVIDER_ROLE");

    // Network identifiers
    uint256 public constant ALKEBULEUM_CHAIN_ID = 1337; // Update with actual chain ID
    uint256 public constant SEPOLIA_CHAIN_ID = 11155111;
    
    // Gas fee management
    struct GasFeeConfig {
        uint256 baseGasPrice;
        uint256 maxGasPrice;
        uint256 gasLimit;
        uint256 priorityFee;
        bool isActive;
    }

    struct TransactionRequest {
        address user;
        address target;
        uint256 value;
        bytes data;
        uint256 gasLimit;
        uint256 maxFeePerGas;
        uint256 maxPriorityFeePerGas;
        uint256 tokenAmount;
        address tokenAddress;
        bool executed;
        bool failed;
        string failureReason;
        uint256 timestamp;
    }

    struct UserBalance {
        uint256 nativeBalance;
        mapping(address => uint256) tokenBalances;
        uint256 totalGasFeesPaid;
        uint256 totalTransactions;
    }

    // State variables
    mapping(uint256 => GasFeeConfig) public networkGasConfigs;
    mapping(address => UserBalance) public userBalances;
    mapping(uint256 => TransactionRequest) public transactionRequests;
    
    uint256 private _transactionCounter;
    
    // Fee configuration
    uint256 public platformFeePercentage = 50; // 0.5% in basis points
    uint256 public gasProviderFeePercentage = 100; // 1% in basis points
    address public feeCollector;
    address public gasProvider;
    
    // Minimum and maximum values
    uint256 public minTransactionAmount = 0.001 ether;
    uint256 public maxTransactionAmount = 100 ether;
    uint256 public minGasPrice = 1000000000; // 1 gwei
    uint256 public maxGasPrice = 100000000000; // 100 gwei

    // Events
    event GasFeeConfigUpdated(uint256 indexed networkId, uint256 baseGasPrice, uint256 maxGasPrice);
    event TransactionRequested(uint256 indexed requestId, address indexed user, address target, uint256 value);
    event TransactionExecuted(uint256 indexed requestId, address indexed user, bool success, uint256 gasUsed);
    event TokensDeposited(address indexed user, address indexed token, uint256 amount);
    event TokensWithdrawn(address indexed user, address indexed token, uint256 amount);
    event GasFeesPaid(address indexed user, uint256 amount, uint256 networkId);
    event PlatformFeeCollected(uint256 amount, address indexed collector);
    event GasProviderFeeCollected(uint256 amount, address indexed provider);

    // Errors
    error InsufficientBalance();
    error InvalidGasPrice();
    error TransactionFailed();
    error InvalidNetwork();
    error Unauthorized();
    error InvalidAmount();
    error TransactionAlreadyExecuted();
    error GasLimitExceeded();

    /**
     * @dev Constructor
     * @param _feeCollector Address to collect platform fees
     * @param _gasProvider Address to provide gas services
     * @param _admin Admin address
     */
    constructor(
        address _feeCollector,
        address _gasProvider,
        address _admin
    ) {
        require(_feeCollector != address(0), "Invalid fee collector");
        require(_gasProvider != address(0), "Invalid gas provider");
        require(_admin != address(0), "Invalid admin");

        feeCollector = _feeCollector;
        gasProvider = _gasProvider;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
        _grantRole(GAS_PROVIDER_ROLE, _gasProvider);

        // Initialize gas configurations for supported networks
        _initializeGasConfigs();
    }

    /**
     * @dev Initialize gas configurations for supported networks
     */
    function _initializeGasConfigs() internal {
        // Alkebuleum network configuration
        networkGasConfigs[ALKEBULEUM_CHAIN_ID] = GasFeeConfig({
            baseGasPrice: 1000000000, // 1 gwei
            maxGasPrice: 50000000000, // 50 gwei
            gasLimit: 300000,
            priorityFee: 1000000000, // 1 gwei
            isActive: true
        });

        // Sepolia network configuration
        networkGasConfigs[SEPOLIA_CHAIN_ID] = GasFeeConfig({
            baseGasPrice: 20000000000, // 20 gwei
            maxGasPrice: 100000000000, // 100 gwei
            gasLimit: 300000,
            priorityFee: 2000000000, // 2 gwei
            isActive: true
        });
    }

    /**
     * @dev Deposit native tokens (ETH/MATIC) for gas fees
     */
    function depositNative() external payable nonReentrant whenNotPaused {
        require(msg.value > 0, "Amount must be greater than 0");
        require(msg.value >= minTransactionAmount, "Amount below minimum");
        require(msg.value <= maxTransactionAmount, "Amount above maximum");

        userBalances[msg.sender].nativeBalance += msg.value;

        emit TokensDeposited(msg.sender, address(0), msg.value);
    }

    /**
     * @dev Deposit ERC20 tokens for gas fees
     * @param token Address of the ERC20 token
     * @param amount Amount to deposit
     */
    function depositTokens(address token, uint256 amount) external nonReentrant whenNotPaused {
        require(token != address(0), "Invalid token address");
        require(amount > 0, "Amount must be greater than 0");
        require(amount >= minTransactionAmount, "Amount below minimum");
        require(amount <= maxTransactionAmount, "Amount above maximum");

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        userBalances[msg.sender].tokenBalances[token] += amount;

        emit TokensDeposited(msg.sender, token, amount);
    }

    /**
     * @dev Withdraw native tokens
     * @param amount Amount to withdraw
     */
    function withdrawNative(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(userBalances[msg.sender].nativeBalance >= amount, "Insufficient balance");

        userBalances[msg.sender].nativeBalance -= amount;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");

        emit TokensWithdrawn(msg.sender, address(0), amount);
    }

    /**
     * @dev Withdraw ERC20 tokens
     * @param token Address of the ERC20 token
     * @param amount Amount to withdraw
     */
    function withdrawTokens(address token, uint256 amount) external nonReentrant {
        require(token != address(0), "Invalid token address");
        require(amount > 0, "Amount must be greater than 0");
        require(userBalances[msg.sender].tokenBalances[token] >= amount, "Insufficient balance");

        userBalances[msg.sender].tokenBalances[token] -= amount;
        IERC20(token).safeTransfer(msg.sender, amount);

        emit TokensWithdrawn(msg.sender, token, amount);
    }

    /**
     * @dev Request a transaction to be executed with gas fees paid by the contract
     * @param target Target contract address
     * @param value ETH value to send
     * @param data Transaction data
     * @param gasLimit Gas limit for the transaction
     * @param maxFeePerGas Maximum fee per gas
     * @param maxPriorityFeePerGas Maximum priority fee per gas
     * @param tokenAddress Token to use for gas fees (address(0) for native)
     * @param tokenAmount Amount of tokens to use for gas fees
     */
    function requestTransaction(
        address target,
        uint256 value,
        bytes calldata data,
        uint256 gasLimit,
        uint256 maxFeePerGas,
        uint256 maxPriorityFeePerGas,
        address tokenAddress,
        uint256 tokenAmount
    ) external nonReentrant whenNotPaused returns (uint256 requestId) {
        require(target != address(0), "Invalid target address");
        require(gasLimit > 0, "Invalid gas limit");
        require(maxFeePerGas >= minGasPrice, "Gas price too low");
        require(maxFeePerGas <= maxGasPrice, "Gas price too high");
        require(gasLimit <= networkGasConfigs[block.chainid].gasLimit, "Gas limit exceeded");

        // Check user balance
        if (tokenAddress == address(0)) {
            require(userBalances[msg.sender].nativeBalance >= tokenAmount, "Insufficient native balance");
        } else {
            require(userBalances[msg.sender].tokenBalances[tokenAddress] >= tokenAmount, "Insufficient token balance");
        }

        // Calculate estimated gas cost
        uint256 estimatedGasCost = gasLimit * maxFeePerGas;
        require(tokenAmount >= estimatedGasCost, "Insufficient amount for gas fees");

        // Deduct tokens from user balance
        if (tokenAddress == address(0)) {
            userBalances[msg.sender].nativeBalance -= tokenAmount;
        } else {
            userBalances[msg.sender].tokenBalances[tokenAddress] -= tokenAmount;
        }

        // Create transaction request
        requestId = _transactionCounter;
        _transactionCounter++;

        transactionRequests[requestId] = TransactionRequest({
            user: msg.sender,
            target: target,
            value: value,
            data: data,
            gasLimit: gasLimit,
            maxFeePerGas: maxFeePerGas,
            maxPriorityFeePerGas: maxPriorityFeePerGas,
            tokenAmount: tokenAmount,
            tokenAddress: tokenAddress,
            executed: false,
            failed: false,
            failureReason: "",
            timestamp: block.timestamp
        });

        userBalances[msg.sender].totalTransactions++;

        emit TransactionRequested(requestId, msg.sender, target, value);
    }

    /**
     * @dev Execute a transaction request (only gas providers can call this)
     * @param requestId ID of the transaction request
     */
    function executeTransaction(uint256 requestId) external nonReentrant onlyRole(GAS_PROVIDER_ROLE) {
        TransactionRequest storage request = transactionRequests[requestId];
        require(!request.executed, "Transaction already executed");
        require(request.user != address(0), "Invalid request");

        request.executed = true;

        // Calculate fees
        uint256 gasUsed = request.gasLimit;
        uint256 actualGasCost = gasUsed * request.maxFeePerGas;
        uint256 platformFee = (actualGasCost * platformFeePercentage) / 10000;
        uint256 gasProviderFee = (actualGasCost * gasProviderFeePercentage) / 10000;
        uint256 remainingAmount = request.tokenAmount - actualGasCost;

        // Execute the transaction
        bool success;
        bytes memory result;
        
        try this.executeTargetTransaction{gas: request.gasLimit}(
            request.target,
            request.value,
            request.data
        ) {
            success = true;
        } catch Error(string memory reason) {
            success = false;
            request.failed = true;
            request.failureReason = reason;
        } catch {
            success = false;
            request.failed = true;
            request.failureReason = "Transaction reverted";
        }

        // Handle fees and refunds
        if (success) {
            // Pay platform fee
            if (platformFee > 0) {
                if (request.tokenAddress == address(0)) {
                    (bool feeSuccess, ) = payable(feeCollector).call{value: platformFee}("");
                    require(feeSuccess, "Platform fee transfer failed");
                } else {
                    IERC20(request.tokenAddress).safeTransfer(feeCollector, platformFee);
                }
                emit PlatformFeeCollected(platformFee, feeCollector);
            }

            // Pay gas provider fee
            if (gasProviderFee > 0) {
                if (request.tokenAddress == address(0)) {
                    (bool providerSuccess, ) = payable(gasProvider).call{value: gasProviderFee}("");
                    require(providerSuccess, "Gas provider fee transfer failed");
                } else {
                    IERC20(request.tokenAddress).safeTransfer(gasProvider, gasProviderFee);
                }
                emit GasProviderFeeCollected(gasProviderFee, gasProvider);
            }

            // Refund remaining amount to user
            if (remainingAmount > 0) {
                if (request.tokenAddress == address(0)) {
                    userBalances[request.user].nativeBalance += remainingAmount;
                } else {
                    userBalances[request.user].tokenBalances[request.tokenAddress] += remainingAmount;
                }
            }

            userBalances[request.user].totalGasFeesPaid += actualGasCost;
        } else {
            // If transaction failed, refund the full amount to user
            if (request.tokenAddress == address(0)) {
                userBalances[request.user].nativeBalance += request.tokenAmount;
            } else {
                userBalances[request.user].tokenBalances[request.tokenAddress] += request.tokenAmount;
            }
        }

        emit TransactionExecuted(requestId, request.user, success, gasUsed);
    }

    /**
     * @dev Execute target transaction (internal function for try-catch)
     * @param target Target contract address
     * @param value ETH value to send
     * @param data Transaction data
     */
    function executeTargetTransaction(
        address target,
        uint256 value,
        bytes calldata data
    ) external {
        require(msg.sender == address(this), "Only self-call allowed");
        
        (bool success, ) = target.call{value: value, gas: gasleft()}(data);
        require(success, "Target transaction failed");
    }

    /**
     * @dev Get user balance for a specific token
     * @param user User address
     * @param token Token address (address(0) for native)
     */
    function getUserBalance(address user, address token) external view returns (uint256) {
        if (token == address(0)) {
            return userBalances[user].nativeBalance;
        } else {
            return userBalances[user].tokenBalances[token];
        }
    }

    /**
     * @dev Get transaction request details
     * @param requestId ID of the transaction request
     */
    function getTransactionRequest(uint256 requestId) external view returns (TransactionRequest memory) {
        return transactionRequests[requestId];
    }

    /**
     * @dev Get gas configuration for a network
     * @param networkId Network chain ID
     */
    function getGasConfig(uint256 networkId) external view returns (GasFeeConfig memory) {
        return networkGasConfigs[networkId];
    }

    /**
     * @dev Update gas configuration for a network (admin only)
     * @param networkId Network chain ID
     * @param baseGasPrice Base gas price
     * @param maxGasPrice Maximum gas price
     * @param gasLimit Gas limit
     * @param priorityFee Priority fee
     * @param isActive Whether the network is active
     */
    function updateGasConfig(
        uint256 networkId,
        uint256 baseGasPrice,
        uint256 maxGasPrice,
        uint256 gasLimit,
        uint256 priorityFee,
        bool isActive
    ) external onlyRole(ADMIN_ROLE) {
        networkGasConfigs[networkId] = GasFeeConfig({
            baseGasPrice: baseGasPrice,
            maxGasPrice: maxGasPrice,
            gasLimit: gasLimit,
            priorityFee: priorityFee,
            isActive: isActive
        });

        emit GasFeeConfigUpdated(networkId, baseGasPrice, maxGasPrice);
    }

    /**
     * @dev Update fee percentages (admin only)
     * @param _platformFeePercentage New platform fee percentage in basis points
     * @param _gasProviderFeePercentage New gas provider fee percentage in basis points
     */
    function updateFeePercentages(
        uint256 _platformFeePercentage,
        uint256 _gasProviderFeePercentage
    ) external onlyRole(ADMIN_ROLE) {
        require(_platformFeePercentage <= 1000, "Platform fee too high"); // Max 10%
        require(_gasProviderFeePercentage <= 1000, "Gas provider fee too high"); // Max 10%

        platformFeePercentage = _platformFeePercentage;
        gasProviderFeePercentage = _gasProviderFeePercentage;
    }

    /**
     * @dev Update transaction limits (admin only)
     * @param _minTransactionAmount New minimum transaction amount
     * @param _maxTransactionAmount New maximum transaction amount
     */
    function updateTransactionLimits(
        uint256 _minTransactionAmount,
        uint256 _maxTransactionAmount
    ) external onlyRole(ADMIN_ROLE) {
        require(_minTransactionAmount < _maxTransactionAmount, "Invalid limits");
        
        minTransactionAmount = _minTransactionAmount;
        maxTransactionAmount = _maxTransactionAmount;
    }

    /**
     * @dev Update gas price limits (admin only)
     * @param _minGasPrice New minimum gas price
     * @param _maxGasPrice New maximum gas price
     */
    function updateGasPriceLimits(
        uint256 _minGasPrice,
        uint256 _maxGasPrice
    ) external onlyRole(ADMIN_ROLE) {
        require(_minGasPrice < _maxGasPrice, "Invalid gas price limits");
        
        minGasPrice = _minGasPrice;
        maxGasPrice = _maxGasPrice;
    }

    /**
     * @dev Update fee collector (admin only)
     * @param _feeCollector New fee collector address
     */
    function updateFeeCollector(address _feeCollector) external onlyRole(ADMIN_ROLE) {
        require(_feeCollector != address(0), "Invalid fee collector");
        feeCollector = _feeCollector;
    }

    /**
     * @dev Update gas provider (admin only)
     * @param _gasProvider New gas provider address
     */
    function updateGasProvider(address _gasProvider) external onlyRole(ADMIN_ROLE) {
        require(_gasProvider != address(0), "Invalid gas provider");
        
        // Revoke old gas provider role
        _revokeRole(GAS_PROVIDER_ROLE, gasProvider);
        
        // Grant new gas provider role
        gasProvider = _gasProvider;
        _grantRole(GAS_PROVIDER_ROLE, _gasProvider);
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

    /**
     * @dev Emergency withdraw (admin only)
     * @param token Token address to withdraw (address(0) for native)
     * @param amount Amount to withdraw
     * @param recipient Recipient address
     */
    function emergencyWithdraw(
        address token,
        uint256 amount,
        address recipient
    ) external onlyRole(ADMIN_ROLE) {
        require(recipient != address(0), "Invalid recipient");
        
        if (token == address(0)) {
            require(address(this).balance >= amount, "Insufficient native balance");
            (bool success, ) = payable(recipient).call{value: amount}("");
            require(success, "Transfer failed");
        } else {
            uint256 balance = IERC20(token).balanceOf(address(this));
            require(balance >= amount, "Insufficient token balance");
            IERC20(token).safeTransfer(recipient, amount);
        }
    }

    /**
     * @dev Get contract balance for a token
     * @param token Token address (address(0) for native)
     */
    function getContractBalance(address token) external view returns (uint256) {
        if (token == address(0)) {
            return address(this).balance;
        } else {
            return IERC20(token).balanceOf(address(this));
        }
    }

    /**
     * @dev Estimate gas cost for a transaction
     * @param gasLimit Gas limit
     * @param maxFeePerGas Maximum fee per gas
     */
    function estimateGasCost(uint256 gasLimit, uint256 maxFeePerGas) external pure returns (uint256) {
        return gasLimit * maxFeePerGas;
    }

    // Receive function to accept native tokens
    receive() external payable {
        // Allow receiving native tokens
    }
}
