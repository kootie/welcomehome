# GasFeeManager Contract Documentation

## Overview

The `GasFeeManager` contract is a comprehensive solution for managing gas fees and token transactions across multiple blockchain networks, specifically designed for Alkebuleum and Sepolia networks. It allows users to deposit tokens and execute transactions with gas fees handled by the contract.

## Key Features

### 🔧 Core Functionality
- **Multi-Network Support**: Optimized for both Alkebuleum and Sepolia networks
- **Token Management**: Support for both native tokens (ETH/MATIC) and ERC20 tokens
- **Gas Fee Handling**: Automated gas fee calculation and payment
- **Transaction Execution**: Secure transaction execution with proper fee distribution
- **Role-Based Access Control**: Secure admin and operator roles

### 💰 Fee Structure
- **Platform Fee**: 0.5% (50 basis points) - Collected by fee collector
- **Gas Provider Fee**: 1% (100 basis points) - Collected by gas provider
- **Configurable**: All fees can be adjusted by admin

### 🌐 Network Configurations

#### Alkebuleum Network (Chain ID: 1337)
- Base Gas Price: 1 gwei
- Max Gas Price: 50 gwei
- Gas Limit: 300,000
- Priority Fee: 1 gwei

#### Sepolia Network (Chain ID: 11155111)
- Base Gas Price: 20 gwei
- Max Gas Price: 100 gwei
- Gas Limit: 300,000
- Priority Fee: 2 gwei

## Contract Architecture

### Roles
- **DEFAULT_ADMIN_ROLE**: Full administrative control
- **ADMIN_ROLE**: Can update configurations and manage fees
- **OPERATOR_ROLE**: Can perform operational tasks
- **GAS_PROVIDER_ROLE**: Can execute transactions and collect gas provider fees

### Key Structs

#### GasFeeConfig
```solidity
struct GasFeeConfig {
    uint256 baseGasPrice;
    uint256 maxGasPrice;
    uint256 gasLimit;
    uint256 priorityFee;
    bool isActive;
}
```

#### TransactionRequest
```solidity
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
```

#### UserBalance
```solidity
struct UserBalance {
    uint256 nativeBalance;
    mapping(address => uint256) tokenBalances;
    uint256 totalGasFeesPaid;
    uint256 totalTransactions;
}
```

## Usage Guide

### 1. Deployment

```javascript
const GasFeeManager = await ethers.getContractFactory("GasFeeManager");
const gasFeeManager = await GasFeeManager.deploy(
    feeCollectorAddress,    // Address to collect platform fees
    gasProviderAddress,     // Address to provide gas services
    adminAddress           // Admin address with full control
);
```

### 2. User Operations

#### Depositing Native Tokens
```javascript
// Deposit ETH for gas fees
await gasFeeManager.depositNative({ value: ethers.utils.parseEther("1.0") });
```

#### Depositing ERC20 Tokens
```javascript
// Approve tokens first
await token.approve(gasFeeManager.address, amount);

// Deposit tokens
await gasFeeManager.depositTokens(tokenAddress, amount);
```

#### Requesting a Transaction
```javascript
const gasLimit = 100000;
const maxFeePerGas = ethers.utils.parseUnits("20", "gwei");
const maxPriorityFeePerGas = ethers.utils.parseUnits("2", "gwei");
const tokenAmount = gasLimit * maxFeePerGas;

// Request transaction
const tx = await gasFeeManager.requestTransaction(
    targetContract.address,  // Target contract
    0,                      // ETH value to send
    transactionData,        // Transaction data
    gasLimit,
    maxFeePerGas,
    maxPriorityFeePerGas,
    ethers.constants.AddressZero, // Native token
    tokenAmount
);
```

#### Executing a Transaction (Gas Provider Only)
```javascript
// Execute transaction
await gasFeeManager.connect(gasProvider).executeTransaction(requestId);
```

### 3. Admin Operations

#### Update Gas Configuration
```javascript
await gasFeeManager.updateGasConfig(
    networkId,           // Chain ID
    baseGasPrice,        // Base gas price in wei
    maxGasPrice,         // Max gas price in wei
    gasLimit,           // Gas limit
    priorityFee,        // Priority fee in wei
    isActive           // Whether network is active
);
```

#### Update Fee Percentages
```javascript
await gasFeeManager.updateFeePercentages(
    platformFeePercentage,     // Platform fee in basis points
    gasProviderFeePercentage   // Gas provider fee in basis points
);
```

#### Pause/Unpause Contract
```javascript
// Pause contract
await gasFeeManager.pause();

// Unpause contract
await gasFeeManager.unpause();
```

## Integration Examples

### Integration with Property Token System

```javascript
// Example: Using GasFeeManager with property transactions
async function executePropertyTransaction(propertyToken, gasFeeManager) {
    // 1. User deposits tokens for gas fees
    await gasFeeManager.depositNative({ value: ethers.utils.parseEther("0.1") });
    
    // 2. Prepare transaction data for property token
    const propertyInterface = new ethers.utils.Interface([
        "function transfer(address to, uint256 amount)"
    ]);
    const transferData = propertyInterface.encodeFunctionData("transfer", [
        recipientAddress,
        tokenAmount
    ]);
    
    // 3. Request transaction
    const gasLimit = 100000;
    const maxFeePerGas = ethers.utils.parseUnits("20", "gwei");
    const tokenAmount = gasLimit * maxFeePerGas;
    
    const tx = await gasFeeManager.requestTransaction(
        propertyToken.address,
        0,
        transferData,
        gasLimit,
        maxFeePerGas,
        maxFeePerGas,
        ethers.constants.AddressZero,
        tokenAmount
    );
    
    // 4. Gas provider executes transaction
    const receipt = await tx.wait();
    const event = receipt.events.find(e => e.event === "TransactionRequested");
    const requestId = event.args.requestId;
    
    await gasFeeManager.connect(gasProvider).executeTransaction(requestId);
}
```

### Integration with Marketplace

```javascript
// Example: Using GasFeeManager with marketplace transactions
async function executeMarketplaceTransaction(marketplace, gasFeeManager) {
    // 1. User deposits tokens
    await gasFeeManager.depositNative({ value: ethers.utils.parseEther("0.05") });
    
    // 2. Prepare marketplace transaction
    const marketplaceInterface = new ethers.utils.Interface([
        "function buyProperty(uint256 propertyId)"
    ]);
    const buyData = marketplaceInterface.encodeFunctionData("buyProperty", [propertyId]);
    
    // 3. Request and execute transaction
    const gasLimit = 150000;
    const maxFeePerGas = ethers.utils.parseUnits("25", "gwei");
    const tokenAmount = gasLimit * maxFeePerGas;
    
    const tx = await gasFeeManager.requestTransaction(
        marketplace.address,
        0,
        buyData,
        gasLimit,
        maxFeePerGas,
        maxFeePerGas,
        ethers.constants.AddressZero,
        tokenAmount
    );
    
    const receipt = await tx.wait();
    const event = receipt.events.find(e => e.event === "TransactionRequested");
    await gasFeeManager.connect(gasProvider).executeTransaction(event.args.requestId);
}
```

## Security Features

### Access Control
- Role-based permissions prevent unauthorized access
- Admin can grant/revoke roles as needed
- Gas provider role is separate from admin role

### Reentrancy Protection
- All external calls are protected against reentrancy attacks
- Uses OpenZeppelin's ReentrancyGuard

### Pausable
- Contract can be paused in emergency situations
- Prevents new deposits and transaction requests when paused

### Input Validation
- Comprehensive validation of all inputs
- Gas price and amount limits prevent abuse
- Network-specific configurations ensure proper operation

## Gas Optimization

### Efficient Storage
- Uses mappings for O(1) lookups
- Optimized struct layouts
- Minimal storage overhead

### Gas-Efficient Operations
- Batch operations where possible
- Efficient event emission
- Optimized loops and calculations

## Testing

### Running Tests
```bash
# Run all tests
npm run test

# Run specific test file
npx hardhat test test/GasFeeManager.test.js

# Run with gas reporting
REPORT_GAS=true npm run test
```

### Test Coverage
- Deployment and initialization
- Native token operations
- ERC20 token operations
- Transaction request and execution
- Fee management
- Admin functions
- Network-specific behavior
- Error handling

## Deployment Scripts

### Deploy to Sepolia
```bash
npx hardhat run scripts/deploy-gas-fee-manager.js --network sepolia
```

### Deploy to Alkebuleum
```bash
npx hardhat run scripts/deploy-gas-fee-manager.js --network alkebuleum
```

### Deploy to Local Network
```bash
npx hardhat run scripts/deploy-gas-fee-manager.js --network localhost
```

## Monitoring and Events

### Key Events
- `TransactionRequested`: When a transaction is requested
- `TransactionExecuted`: When a transaction is executed
- `TokensDeposited`: When tokens are deposited
- `TokensWithdrawn`: When tokens are withdrawn
- `GasFeesPaid`: When gas fees are paid
- `PlatformFeeCollected`: When platform fees are collected
- `GasProviderFeeCollected`: When gas provider fees are collected

### Monitoring Setup
```javascript
// Monitor transaction requests
gasFeeManager.on("TransactionRequested", (requestId, user, target, value) => {
    console.log(`Transaction requested: ${requestId} by ${user} to ${target}`);
});

// Monitor transaction execution
gasFeeManager.on("TransactionExecuted", (requestId, user, success, gasUsed) => {
    console.log(`Transaction executed: ${requestId} by ${user}, success: ${success}`);
});
```

## Troubleshooting

### Common Issues

1. **Insufficient Balance Error**
   - Ensure user has deposited enough tokens
   - Check minimum transaction amounts

2. **Gas Limit Exceeded**
   - Reduce gas limit or increase max gas price
   - Check network-specific gas configurations

3. **Transaction Execution Failed**
   - Verify gas provider has GAS_PROVIDER_ROLE
   - Check target contract is valid and callable

4. **Invalid Gas Price**
   - Ensure gas price is within network limits
   - Check current network gas configurations

### Debug Commands
```javascript
// Check user balance
const balance = await gasFeeManager.getUserBalance(userAddress, tokenAddress);

// Check transaction request
const request = await gasFeeManager.getTransactionRequest(requestId);

// Check gas configuration
const config = await gasFeeManager.getGasConfig(networkId);

// Estimate gas cost
const cost = await gasFeeManager.estimateGasCost(gasLimit, maxFeePerGas);
```

## Future Enhancements

### Planned Features
- **Multi-Signature Support**: Require multiple signatures for large transactions
- **Gas Price Oracle Integration**: Dynamic gas price adjustment based on network conditions
- **Batch Transactions**: Execute multiple transactions in a single call
- **Cross-Chain Support**: Extend to other networks beyond Alkebuleum and Sepolia
- **Advanced Analytics**: Detailed transaction and fee analytics

### Upgrade Path
- Contract is designed to be upgradeable using OpenZeppelin's upgradeable contracts
- Admin can update configurations without redeployment
- New features can be added through proxy upgrades

## Support and Maintenance

### Regular Maintenance
- Monitor gas price trends on supported networks
- Update gas configurations as needed
- Review and adjust fee percentages
- Monitor contract usage and performance

### Emergency Procedures
- Pause contract if security issues are detected
- Use emergency withdraw function if needed
- Update gas provider if current provider is compromised

For technical support or questions, please refer to the project documentation or contact the development team.
