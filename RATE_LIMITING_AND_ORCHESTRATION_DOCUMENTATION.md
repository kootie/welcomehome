# Rate Limiting and Transaction Orchestration System

## Overview

The Rate Limiting and Transaction Orchestration system provides a comprehensive solution for managing transaction throughput and gas fees across multiple blockchain networks. This system is designed to work efficiently with a locally run node, allowing the platform to optimize transaction execution and reduce costs.

## System Architecture

### Core Components

1. **RateLimiter** - Manages transaction rate limiting and priority queues
2. **GasFeeManager** - Handles gas fee collection and distribution
3. **TransactionOrchestrator** - Integrates both systems for unified transaction management

### Key Features

- **Multi-Network Support**: Optimized for Alkebuleum, Sepolia, and Ethereum Mainnet
- **Priority-Based Queuing**: 5 priority levels from LOW to CRITICAL
- **Rate Limiting**: Per-user and per-network transaction limits
- **Gas Fee Management**: Automated gas fee calculation and payment
- **Batch Processing**: Execute multiple transactions efficiently
- **Performance Monitoring**: Real-time metrics and analytics
- **Local Node Optimization**: Designed for efficient local node operation

## RateLimiter Contract

### Priority Levels

```solidity
enum Priority {
    LOW,        // 0 - Standard transactions
    NORMAL,     // 1 - Regular priority
    HIGH,       // 2 - High priority
    URGENT,     // 3 - Urgent transactions
    CRITICAL    // 4 - Critical system transactions
}
```

### Network-Specific Rate Limits

#### Ethereum Mainnet (Chain ID: 1)
- Max Transactions/Second: 50
- Max Transactions/Minute: 3,000
- Max Transactions/Hour: 180,000
- Max Gas/Second: 30M gas
- Max Gas/Minute: 1.8B gas
- Max Gas/Hour: 108B gas

#### Sepolia Testnet (Chain ID: 11155111)
- Max Transactions/Second: 100
- Max Transactions/Minute: 6,000
- Max Transactions/Hour: 360,000
- Max Gas/Second: 50M gas
- Max Gas/Minute: 3B gas
- Max Gas/Hour: 180B gas

#### Alkebuleum (Chain ID: 1337)
- Max Transactions/Second: 200
- Max Transactions/Minute: 12,000
- Max Transactions/Hour: 720,000
- Max Gas/Second: 100M gas
- Max Gas/Minute: 6B gas
- Max Gas/Hour: 360B gas

### Key Functions

#### Queue Management
```javascript
// Queue a transaction
await rateLimiter.queueTransaction(
    target,           // Target contract address
    gasLimit,         // Gas limit for transaction
    priority,         // Priority level (0-4)
    priorityFee       // Priority fee in wei
);

// Execute next transaction from queue
await rateLimiter.executeNextTransaction(maxGas);

// Execute specific transaction
await rateLimiter.executeTransaction(transactionId, maxGas);
```

#### Queue Statistics
```javascript
// Get queue statistics
const stats = await rateLimiter.getQueueStats();
console.log("Total queued:", stats.totalQueued);
console.log("Low priority:", stats.lowPriority);
console.log("Normal priority:", stats.normalPriority);
console.log("High priority:", stats.highPriority);
console.log("Urgent priority:", stats.urgentPriority);
console.log("Critical priority:", stats.criticalPriority);
```

#### Rate Management
```javascript
// Get user rate information
const userRate = await rateLimiter.getUserRate(userAddress);
console.log("Transactions this second:", userRate.transactionsThisSecond);
console.log("Gas used this second:", userRate.gasUsedThisSecond);

// Check if user can queue transaction
const canQueue = await rateLimiter.canQueueTransaction(userAddress, gasLimit);
```

## TransactionOrchestrator Contract

### Integration Features

The TransactionOrchestrator combines GasFeeManager and RateLimiter functionality to provide:

- **Unified Transaction Management**: Single interface for gas fees and rate limiting
- **Automatic Fee Distribution**: Platform, gas provider, and orchestrator fees
- **Priority-Based Execution**: Execute transactions based on priority levels
- **Batch Processing**: Execute multiple transactions efficiently
- **Performance Tracking**: Monitor execution times and success rates

### Configuration

```javascript
// Default configuration
maxBatchSize = 10;                    // Maximum transactions per batch
executionTimeout = 300;               // 5 minutes timeout
minExecutionInterval = 1;             // 1 second between executions
orchestratorFeePercentage = 25;       // 0.25% orchestrator fee
```

### Key Functions

#### Transaction Orchestration
```javascript
// Orchestrate a transaction
const transactionId = await transactionOrchestrator.orchestrateTransaction(
    target,                    // Target contract address
    value,                     // ETH value to send
    data,                      // Transaction data
    gasLimit,                  // Gas limit
    maxFeePerGas,              // Maximum fee per gas
    maxPriorityFeePerGas,      // Maximum priority fee per gas
    tokenAddress,              // Token for gas fees (address(0) for native)
    tokenAmount,               // Amount of tokens for gas fees
    priority                   // Priority level
);
```

#### Transaction Execution
```javascript
// Execute single transaction
await transactionOrchestrator.executeTransaction(transactionId);

// Execute batch of transactions
await transactionOrchestrator.executeBatch([id1, id2, id3]);

// Execute next transaction from priority queue
const executedId = await transactionOrchestrator.executeNextTransaction();
```

#### Performance Monitoring
```javascript
// Get performance metrics
const metrics = await transactionOrchestrator.getPerformanceMetrics();
console.log("Total processed:", metrics.totalProcessed);
console.log("Total gas used:", metrics.totalGas);
console.log("Average execution time:", metrics.avgExecutionTime);
console.log("Success rate:", metrics.successRateBps / 100, "%");
```

## Local Node Integration

### Benefits of Local Node Operation

1. **Reduced Latency**: Direct connection to blockchain network
2. **Lower Costs**: No third-party API fees
3. **Better Control**: Full control over transaction submission
4. **Privacy**: No data shared with external services
5. **Reliability**: No dependency on external service availability

### Setup for Local Node

#### 1. Install and Configure Local Node
```bash
# Install Ethereum node (example with Geth)
geth --datadir ./chaindata --networkid 1337 --http --http.addr 0.0.0.0 --http.port 8545 --http.corsdomain "*" --http.api "eth,net,web3,personal,miner" --allow-insecure-unlock --mine --miner.threads 1 --unlock "0xYOUR_ADDRESS" --password ./password.txt
```

#### 2. Configure Hardhat
```javascript
// hardhat.config.js
module.exports = {
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};
```

#### 3. Deploy Contracts
```bash
# Deploy to local network
npm run deploy:orchestrator:local
```

### Optimization Strategies

#### 1. Batch Processing
```javascript
// Execute multiple transactions in a single batch
const transactionIds = [1, 2, 3, 4, 5];
await transactionOrchestrator.executeBatch(transactionIds);
```

#### 2. Priority Management
```javascript
// Use appropriate priority levels
const priorities = {
  LOW: 0,        // Standard transactions
  NORMAL: 1,     // Regular transactions
  HIGH: 2,       // Important transactions
  URGENT: 3,     // Time-sensitive transactions
  CRITICAL: 4    // System-critical transactions
};
```

#### 3. Rate Limit Optimization
```javascript
// Update rate limits for local node
await rateLimiter.updateRateLimit(
    1337,           // Chain ID
    500,            // Max TPS (higher for local)
    30000,          // Max TPM
    1800000,        // Max TPH
    200000000,      // Max Gas/Second (200M)
    12000000000,    // Max Gas/Minute (12B)
    720000000000,   // Max Gas/Hour (720B)
    true            // Active
);
```

## Usage Examples

### Example 1: Basic Transaction Orchestration

```javascript
const { ethers } = require("hardhat");

async function orchestrateBasicTransaction() {
    const [user] = await ethers.getSigners();
    
    // 1. Deposit tokens to GasFeeManager
    await gasFeeManager.connect(user).depositNative({ 
        value: ethers.utils.parseEther("0.1") 
    });
    
    // 2. Prepare transaction data
    const targetContract = "0x..."; // Target contract address
    const data = "0x..."; // Transaction data
    
    // 3. Orchestrate transaction
    const transactionId = await transactionOrchestrator.connect(user).orchestrateTransaction(
        targetContract,
        0, // No ETH value
        data,
        100000, // Gas limit
        ethers.utils.parseUnits("20", "gwei"), // Max fee per gas
        ethers.utils.parseUnits("2", "gwei"), // Max priority fee per gas
        ethers.constants.AddressZero, // Native token
        ethers.utils.parseEther("0.01"), // Token amount
        1 // NORMAL priority
    );
    
    console.log("Transaction orchestrated with ID:", transactionId.toString());
}
```

### Example 2: Batch Transaction Processing

```javascript
async function processBatchTransactions() {
    const transactionIds = [];
    
    // Queue multiple transactions
    for (let i = 0; i < 5; i++) {
        const txId = await transactionOrchestrator.orchestrateTransaction(
            targetContract,
            0,
            data,
            100000,
            ethers.utils.parseUnits("20", "gwei"),
            ethers.utils.parseUnits("2", "gwei"),
            ethers.constants.AddressZero,
            ethers.utils.parseEther("0.01"),
            1
        );
        transactionIds.push(txId);
    }
    
    // Execute batch
    await transactionOrchestrator.executeBatch(transactionIds);
    console.log("Batch executed successfully");
}
```

### Example 3: Priority-Based Processing

```javascript
async function priorityBasedProcessing() {
    // Queue transactions with different priorities
    const lowPriorityTx = await transactionOrchestrator.orchestrateTransaction(
        targetContract, 0, data, 100000, 
        ethers.utils.parseUnits("20", "gwei"), 
        ethers.utils.parseUnits("2", "gwei"),
        ethers.constants.AddressZero, 
        ethers.utils.parseEther("0.01"), 
        0 // LOW priority
    );
    
    const highPriorityTx = await transactionOrchestrator.orchestrateTransaction(
        targetContract, 0, data, 100000,
        ethers.utils.parseUnits("30", "gwei"), // Higher gas price
        ethers.utils.parseUnits("5", "gwei"),  // Higher priority fee
        ethers.constants.AddressZero,
        ethers.utils.parseEther("0.02"), // More tokens
        3 // URGENT priority
    );
    
    // High priority transaction will be executed first
    await transactionOrchestrator.executeNextTransaction();
}
```

## Monitoring and Analytics

### Performance Metrics

```javascript
// Get real-time performance metrics
const metrics = await transactionOrchestrator.getPerformanceMetrics();

console.log("Performance Report:");
console.log("- Total Transactions:", metrics.totalProcessed);
console.log("- Total Gas Used:", metrics.totalGas);
console.log("- Average Execution Time:", metrics.avgExecutionTime, "seconds");
console.log("- Success Rate:", (metrics.successRateBps / 100).toFixed(2), "%");
```

### Queue Monitoring

```javascript
// Monitor queue status
const queueStats = await transactionOrchestrator.getQueueStats();

console.log("Queue Status:");
console.log("- Total Queued:", queueStats.totalQueued);
console.log("- Critical Priority:", queueStats.criticalPriority);
console.log("- Urgent Priority:", queueStats.urgentPriority);
console.log("- High Priority:", queueStats.highPriority);
console.log("- Normal Priority:", queueStats.normalPriority);
console.log("- Low Priority:", queueStats.lowPriority);
```

### User Rate Monitoring

```javascript
// Monitor user rate usage
const userRate = await rateLimiter.getUserRate(userAddress);

console.log("User Rate Usage:");
console.log("- Transactions/Second:", userRate.transactionsThisSecond);
console.log("- Transactions/Minute:", userRate.transactionsThisMinute);
console.log("- Transactions/Hour:", userRate.transactionsThisHour);
console.log("- Gas Used/Second:", userRate.gasUsedThisSecond);
console.log("- Total Transactions:", userRate.totalTransactions);
console.log("- Total Gas Used:", userRate.totalGasUsed);
```

## Security Considerations

### Access Control

- **Role-Based Permissions**: Different roles for different operations
- **Admin Controls**: Only admins can update critical configurations
- **Rate Limiting**: Prevents abuse and DoS attacks
- **Queue Management**: Prevents queue overflow attacks

### Fee Management

- **Fee Validation**: Ensures fees are within acceptable ranges
- **Refund Mechanisms**: Automatic refunds for failed transactions
- **Emergency Controls**: Ability to pause operations if needed

### Network Security

- **Local Node Security**: Secure local node configuration
- **Transaction Validation**: Validate all transaction parameters
- **Gas Limit Enforcement**: Prevent excessive gas usage

## Deployment Commands

### Deploy to Sepolia
```bash
# Deploy RateLimiter
npm run deploy:rate-limiter:sepolia

# Deploy TransactionOrchestrator (includes GasFeeManager and RateLimiter)
npm run deploy:orchestrator:sepolia
```

### Deploy to Alkebuleum
```bash
# Deploy RateLimiter
npm run deploy:rate-limiter:alkebuleum

# Deploy TransactionOrchestrator
npm run deploy:orchestrator:alkebuleum
```

### Deploy to Local Network
```bash
# Deploy RateLimiter
npm run deploy:rate-limiter:local

# Deploy TransactionOrchestrator
npm run deploy:orchestrator:local
```

## Testing

### Run Tests
```bash
# Test RateLimiter
npm run test:rate-limiter

# Test TransactionOrchestrator
npm run test:orchestrator

# Test with gas reporting
REPORT_GAS=true npm run test:orchestrator
```

### Test Coverage
- Rate limiting functionality
- Priority queue management
- Transaction orchestration
- Batch processing
- Performance metrics
- Fee distribution
- Error handling

## Troubleshooting

### Common Issues

1. **Rate Limit Exceeded**
   - Check user's current rate usage
   - Wait for rate limits to reset
   - Consider upgrading priority level

2. **Insufficient Balance**
   - Ensure user has deposited enough tokens
   - Check token approval for ERC20 tokens

3. **Queue Full**
   - Increase max queue size
   - Clean up expired transactions
   - Process queued transactions

4. **Transaction Timeout**
   - Check execution timeout settings
   - Ensure transactions are being processed
   - Monitor queue processing

### Debug Commands

```javascript
// Check if transaction can be orchestrated
const canOrchestrate = await transactionOrchestrator.canOrchestrateTransaction(
    userAddress, gasLimit, tokenAmount, tokenAddress
);

// Get estimated execution time
const estimatedTime = await transactionOrchestrator.getEstimatedExecutionTime(priority);

// Check user rate limits
const userRate = await rateLimiter.getUserRate(userAddress);

// Get queue statistics
const queueStats = await transactionOrchestrator.getQueueStats();
```

## Future Enhancements

### Planned Features

1. **Dynamic Rate Limiting**: Adjust limits based on network conditions
2. **Advanced Analytics**: Detailed transaction analytics and reporting
3. **Cross-Chain Support**: Extend to other blockchain networks
4. **Automated Optimization**: AI-powered transaction optimization
5. **Advanced Batching**: Smart batching algorithms
6. **Real-time Monitoring**: WebSocket-based real-time updates

### Integration Opportunities

1. **MEV Protection**: Integration with MEV protection services
2. **Gas Price Oracles**: Dynamic gas price adjustment
3. **Multi-Signature Support**: Enhanced security with multi-sig
4. **Advanced Scheduling**: Time-based transaction scheduling
5. **Load Balancing**: Distribute transactions across multiple nodes

## Support and Maintenance

### Regular Maintenance

- Monitor performance metrics
- Update rate limits based on network conditions
- Clean up expired transactions
- Optimize batch sizes and execution intervals
- Review and adjust fee structures

### Emergency Procedures

- Pause contracts if security issues detected
- Update rate limits to prevent abuse
- Emergency transaction processing
- Rollback to previous configurations if needed

For technical support or questions, please refer to the project documentation or contact the development team.
