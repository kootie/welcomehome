import { ethers } from 'ethers';
import { 
  GasFeeConfig, 
  TransactionRequest, 
  UserBalance, 
  RateLimit, 
  QueuedTransaction, 
  UserRate, 
  Priority, 
  OrchestratedTransaction,
  GasFeeEstimate,
  TransactionQueueStats,
  PerformanceMetrics,
  WalletConnection
} from '../types/index.ts';

// Contract ABIs (these would be imported from the compiled contracts)
const GAS_FEE_MANAGER_ABI = [
  // GasFeeManager ABI would be here
  "function depositNative() external payable returns (bool)",
  "function depositERC20(address token, uint256 amount) external returns (bool)",
  "function requestTransaction(address target, uint256 value, bytes calldata data, uint256 gasLimit, uint256 maxFeePerGas, uint256 maxPriorityFeePerGas, address tokenAddress, uint256 tokenAmount) external returns (uint256)",
  "function getUserBalance(address user, address tokenAddress) external view returns (uint256)",
  "function getTransactionDetails(uint256 transactionId) external view returns (tuple(address user, address target, uint256 value, bytes data, uint256 gasLimit, uint256 maxFeePerGas, uint256 maxPriorityFeePerGas, uint256 tokenAmount, address tokenAddress, bool executed, bool failed, string failureReason, uint256 timestamp))",
  "function platformFeePercentage() external view returns (uint256)",
  "function gasProviderFeePercentage() external view returns (uint256)",
  "function minTransactionAmount() external view returns (uint256)",
  "function maxTransactionAmount() external view returns (uint256)"
];

const RATE_LIMITER_ABI = [
  // RateLimiter ABI would be here
  "function queueTransaction(address target, uint256 gasLimit, uint8 priority, uint256 priorityFee) external returns (uint256)",
  "function executeNextTransaction(uint256 maxGas) external returns (uint256)",
  "function getNextTransaction(uint8 priority) external view returns (uint256)",
  "function getQueueStats() external view returns (uint256 totalQueued, uint256 totalExecuted, uint256 totalFailed, uint256 averageExecutionTime, uint256 successRate)",
  "function getUserRate(address user) external view returns (tuple(uint256 lastTransactionTime, uint256 transactionsThisSecond, uint256 transactionsThisMinute, uint256 transactionsThisHour, uint256 gasUsedThisSecond, uint256 gasUsedThisMinute, uint256 gasUsedThisHour, uint256 totalTransactions, uint256 totalGasUsed))",
  "function getRateLimit(uint256 networkId) external view returns (tuple(uint256 maxTransactionsPerSecond, uint256 maxTransactionsPerMinute, uint256 maxTransactionsPerHour, uint256 maxGasPerSecond, uint256 maxGasPerMinute, uint256 maxGasPerHour, bool isActive))",
  "function globalMaxTransactionsPerSecond() external view returns (uint256)",
  "function globalMaxGasPerSecond() external view returns (uint256)"
];

const TRANSACTION_ORCHESTRATOR_ABI = [
  // TransactionOrchestrator ABI would be here
  "function orchestrateTransaction(address target, uint256 value, bytes calldata data, uint256 gasLimit, uint256 maxFeePerGas, uint256 maxPriorityFeePerGas, address tokenAddress, uint256 tokenAmount, uint8 priority) external returns (uint256)",
  "function executeTransaction(uint256 transactionId) external",
  "function executeBatch(uint256[] calldata transactionIds) external",
  "function executeNextTransaction() external returns (uint256)",
  "function getTransaction(uint256 transactionId) external view returns (tuple(uint256 id, address user, address target, uint256 value, bytes data, uint256 gasLimit, uint256 maxFeePerGas, uint256 maxPriorityFeePerGas, address tokenAddress, uint256 tokenAmount, uint8 priority, bool gasFeesPaid, bool rateLimitChecked, bool executed, bool failed, string failureReason, uint256 timestamp, uint256 executionTime))",
  "function getUserTransactions(address user) external view returns (uint256[])",
  "function getQueueStats() external view returns (uint256 totalQueued, uint256 totalExecuted, uint256 totalFailed, uint256 averageExecutionTime, uint256 successRate)",
  "function getPerformanceMetrics() external view returns (uint256 totalProcessed, uint256 totalGas, uint256 avgExecutionTime, uint256 successRate)",
  "function orchestratorFeePercentage() external view returns (uint256)",
  "function maxBatchSize() external view returns (uint256)"
];

// Network configurations
export const NETWORKS = {
  LOCALHOST: {
    chainId: 31337,
    name: 'Localhost',
    rpcUrl: 'http://127.0.0.1:8545',
    explorer: 'http://localhost:4000',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  ALKEBULEUM: {
    chainId: 1337,
    name: 'Alkebuleum',
    rpcUrl: 'http://localhost:8545', // Local node
    explorer: 'http://localhost:4000',
    nativeCurrency: { name: 'Alkebuleum', symbol: 'ALK', decimals: 18 }
  },
  SEPOLIA: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
    explorer: 'https://sepolia.etherscan.io',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 }
  }
};

// Contract addresses (these would be deployed addresses)
const CONTRACT_ADDRESSES = {
  [NETWORKS.LOCALHOST.chainId]: {
    gasFeeManager: '0x68B1D87F95878fE05B998F19b66F4baba5De1aed',
    rateLimiter: '0x3Aa5ebB10DC797CAC828524e59A333d0A371443c',
    transactionOrchestrator: '0xc6e7DF5E7b4f2A278906862b61205850344D4e7d'
  },
  [NETWORKS.ALKEBULEUM.chainId]: {
    gasFeeManager: '0x...',
    rateLimiter: '0x...',
    transactionOrchestrator: '0x...'
  },
  [NETWORKS.SEPOLIA.chainId]: {
    gasFeeManager: '0x...',
    rateLimiter: '0x...',
    transactionOrchestrator: '0x...'
  }
};

class Web3Service {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;
  private gasFeeManager: ethers.Contract | null = null;
  private rateLimiter: ethers.Contract | null = null;
  private transactionOrchestrator: ethers.Contract | null = null;
  private currentNetwork: number | null = null;

  // Initialize Web3 connection
  async initialize(): Promise<boolean> {
    try {
      if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask is not installed');
      }

      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      
      // Get current network
      const network = await this.provider.getNetwork();
      this.currentNetwork = Number(network.chainId);
      
      // Initialize contracts for current network
      await this.initializeContracts();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Web3:', error);
      return false;
    }
  }

  // Initialize contracts for the current network
  private async initializeContracts(): Promise<void> {
    if (!this.currentNetwork || !this.signer) {
      throw new Error('Web3 not initialized');
    }

    const addresses = CONTRACT_ADDRESSES[this.currentNetwork];
    if (!addresses) {
      throw new Error(`No contracts deployed on network ${this.currentNetwork}`);
    }

    this.gasFeeManager = new ethers.Contract(
      addresses.gasFeeManager,
      GAS_FEE_MANAGER_ABI,
      this.signer
    );

    this.rateLimiter = new ethers.Contract(
      addresses.rateLimiter,
      RATE_LIMITER_ABI,
      this.signer
    );

    this.transactionOrchestrator = new ethers.Contract(
      addresses.transactionOrchestrator,
      TRANSACTION_ORCHESTRATOR_ABI,
      this.signer
    );
  }

  // Switch network
  async switchNetwork(chainId: number): Promise<boolean> {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }

      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });

      // Reinitialize after network switch
      await this.initialize();
      return true;
    } catch (error) {
      console.error('Failed to switch network:', error);
      return false;
    }
  }

  // Get current wallet connection
  getWalletConnection(): WalletConnection | null {
    if (!this.signer || !this.currentNetwork) {
      return null;
    }

    return {
      address: this.signer.address,
      network: this.getNetworkName(this.currentNetwork),
      chainId: this.currentNetwork,
      connected: true,
      balance: {
        native: '0', // Would be fetched separately
        tokens: {}
      }
    };
  }

  // Get network name
  private getNetworkName(chainId: number): 'ALKEBULEUM' | 'SEPOLIA' | 'LOCALHOST' {
    switch (chainId) {
      case NETWORKS.LOCALHOST.chainId:
        return 'LOCALHOST';
      case NETWORKS.ALKEBULEUM.chainId:
        return 'ALKEBULEUM';
      case NETWORKS.SEPOLIA.chainId:
        return 'SEPOLIA';
      default:
        throw new Error(`Unknown network: ${chainId}`);
    }
  }

  // GasFeeManager methods
  async depositNative(amount: string): Promise<boolean> {
    if (!this.gasFeeManager) {
      throw new Error('GasFeeManager not initialized');
    }

    const tx = await this.gasFeeManager.depositNative({ value: amount });
    await tx.wait();
    return true;
  }

  async depositERC20(tokenAddress: string, amount: string): Promise<boolean> {
    if (!this.gasFeeManager) {
      throw new Error('GasFeeManager not initialized');
    }

    const tx = await this.gasFeeManager.depositERC20(tokenAddress, amount);
    await tx.wait();
    return true;
  }

  async requestTransaction(
    target: string,
    value: string,
    data: string,
    gasLimit: string,
    maxFeePerGas: string,
    maxPriorityFeePerGas: string,
    tokenAddress: string,
    tokenAmount: string
  ): Promise<string> {
    if (!this.gasFeeManager) {
      throw new Error('GasFeeManager not initialized');
    }

    const tx = await this.gasFeeManager.requestTransaction(
      target,
      value,
      data,
      gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas,
      tokenAddress,
      tokenAmount
    );
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async getUserBalance(user: string, tokenAddress: string): Promise<string> {
    if (!this.gasFeeManager) {
      throw new Error('GasFeeManager not initialized');
    }

    return await this.gasFeeManager.getUserBalance(user, tokenAddress);
  }

  async getTransactionDetails(transactionId: string): Promise<TransactionRequest> {
    if (!this.gasFeeManager) {
      throw new Error('GasFeeManager not initialized');
    }

    const details = await this.gasFeeManager.getTransactionDetails(transactionId);
    return {
      user: details.user,
      target: details.target,
      value: details.value.toString(),
      data: details.data,
      gasLimit: details.gasLimit.toString(),
      maxFeePerGas: details.maxFeePerGas.toString(),
      maxPriorityFeePerGas: details.maxPriorityFeePerGas.toString(),
      tokenAmount: details.tokenAmount.toString(),
      tokenAddress: details.tokenAddress,
      executed: details.executed,
      failed: details.failed,
      failureReason: details.failureReason,
      timestamp: details.timestamp.toString()
    };
  }

  // RateLimiter methods
  async queueTransaction(
    target: string,
    gasLimit: string,
    priority: Priority,
    priorityFee: string
  ): Promise<string> {
    if (!this.rateLimiter) {
      throw new Error('RateLimiter not initialized');
    }

    const tx = await this.rateLimiter.queueTransaction(target, gasLimit, priority, priorityFee);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async executeNextTransaction(maxGas: string): Promise<string> {
    if (!this.rateLimiter) {
      throw new Error('RateLimiter not initialized');
    }

    const tx = await this.rateLimiter.executeNextTransaction(maxGas);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async getQueueStats(): Promise<TransactionQueueStats> {
    if (!this.rateLimiter) {
      throw new Error('RateLimiter not initialized');
    }

    const stats = await this.rateLimiter.getQueueStats();
    return {
      totalQueued: stats[0].toString(),
      totalExecuted: stats[1].toString(),
      totalFailed: stats[2].toString(),
      averageExecutionTime: stats[3].toString(),
      successRate: stats[4].toString(),
      queueByPriority: {
        [Priority.LOW]: '0',
        [Priority.NORMAL]: '0',
        [Priority.HIGH]: '0',
        [Priority.URGENT]: '0',
        [Priority.CRITICAL]: '0'
      }
    };
  }

  async getUserRate(user: string): Promise<UserRate> {
    if (!this.rateLimiter) {
      throw new Error('RateLimiter not initialized');
    }

    const rate = await this.rateLimiter.getUserRate(user);
    return {
      lastTransactionTime: rate[0].toString(),
      transactionsThisSecond: rate[1].toString(),
      transactionsThisMinute: rate[2].toString(),
      transactionsThisHour: rate[3].toString(),
      gasUsedThisSecond: rate[4].toString(),
      gasUsedThisMinute: rate[5].toString(),
      gasUsedThisHour: rate[6].toString(),
      totalTransactions: rate[7].toString(),
      totalGasUsed: rate[8].toString()
    };
  }

  // TransactionOrchestrator methods
  async orchestrateTransaction(
    target: string,
    value: string,
    data: string,
    gasLimit: string,
    maxFeePerGas: string,
    maxPriorityFeePerGas: string,
    tokenAddress: string,
    tokenAmount: string,
    priority: Priority
  ): Promise<string> {
    if (!this.transactionOrchestrator) {
      throw new Error('TransactionOrchestrator not initialized');
    }

    const tx = await this.transactionOrchestrator.orchestrateTransaction(
      target,
      value,
      data,
      gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas,
      tokenAddress,
      tokenAmount,
      priority
    );
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async executeTransaction(transactionId: string): Promise<void> {
    if (!this.transactionOrchestrator) {
      throw new Error('TransactionOrchestrator not initialized');
    }

    const tx = await this.transactionOrchestrator.executeTransaction(transactionId);
    await tx.wait();
  }

  async executeBatch(transactionIds: string[]): Promise<void> {
    if (!this.transactionOrchestrator) {
      throw new Error('TransactionOrchestrator not initialized');
    }

    const tx = await this.transactionOrchestrator.executeBatch(transactionIds);
    await tx.wait();
  }

  async getTransaction(transactionId: string): Promise<OrchestratedTransaction> {
    if (!this.transactionOrchestrator) {
      throw new Error('TransactionOrchestrator not initialized');
    }

    const transaction = await this.transactionOrchestrator.getTransaction(transactionId);
    return {
      id: transaction[0].toString(),
      user: transaction[1],
      target: transaction[2],
      value: transaction[3].toString(),
      data: transaction[4],
      gasLimit: transaction[5].toString(),
      maxFeePerGas: transaction[6].toString(),
      maxPriorityFeePerGas: transaction[7].toString(),
      tokenAddress: transaction[8],
      tokenAmount: transaction[9].toString(),
      priority: transaction[10] as Priority,
      gasFeesPaid: transaction[11],
      rateLimitChecked: transaction[12],
      executed: transaction[13],
      failed: transaction[14],
      failureReason: transaction[15],
      timestamp: transaction[16].toString(),
      executionTime: transaction[17].toString()
    };
  }

  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    if (!this.transactionOrchestrator) {
      throw new Error('TransactionOrchestrator not initialized');
    }

    const metrics = await this.transactionOrchestrator.getPerformanceMetrics();
    return {
      totalTransactionsProcessed: metrics[0].toString(),
      totalGasUsed: metrics[1].toString(),
      averageExecutionTime: metrics[2].toString(),
      successRate: metrics[3].toString(),
      throughput: {
        transactionsPerSecond: '0', // Would be calculated
        gasPerSecond: '0' // Would be calculated
      }
    };
  }

  // Utility methods
  async estimateGasFees(
    target: string,
    value: string,
    data: string,
    priority: Priority = Priority.NORMAL
  ): Promise<GasFeeEstimate> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    // Get current gas price
    const feeData = await this.provider.getFeeData();
    
    // Estimate gas limit
    const gasLimit = await this.provider.estimateGas({
      to: target,
      value: value,
      data: data
    });

    // Calculate fees based on priority
    const priorityMultiplier = this.getPriorityMultiplier(priority);
    const maxFeePerGas = (feeData.maxFeePerGas || 0n) * BigInt(priorityMultiplier);
    const maxPriorityFeePerGas = (feeData.maxPriorityFeePerGas || 0n) * BigInt(priorityMultiplier);

    const gasCost = gasLimit * maxFeePerGas;
    const platformFee = gasCost * 50n / 10000n; // 0.5%
    const networkFee = gasCost * 100n / 10000n; // 1%
    const total = gasCost + platformFee + networkFee;

    return {
      gasLimit: gasLimit.toString(),
      gasPrice: feeData.gasPrice?.toString() || '0',
      maxFeePerGas: maxFeePerGas.toString(),
      maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
      totalCost: total.toString(),
      breakdown: {
        gasCost: gasCost.toString(),
        platformFee: platformFee.toString(),
        networkFee: networkFee.toString(),
        total: total.toString()
      }
    };
  }

  private getPriorityMultiplier(priority: Priority): number {
    switch (priority) {
      case Priority.LOW:
        return 80; // 80% of base
      case Priority.NORMAL:
        return 100; // 100% of base
      case Priority.HIGH:
        return 120; // 120% of base
      case Priority.URGENT:
        return 150; // 150% of base
      case Priority.CRITICAL:
        return 200; // 200% of base
      default:
        return 100;
    }
  }

  // Format Wei to Ether
  formatEther(wei: string): string {
    return ethers.formatEther(wei);
  }

  // Format Ether to Wei
  parseEther(ether: string): string {
    return ethers.parseEther(ether).toString();
  }

  // Get current network info
  getCurrentNetwork() {
    return this.currentNetwork ? NETWORKS[this.getNetworkName(this.currentNetwork)] : null;
  }

  // Check if connected
  isConnected(): boolean {
    return this.signer !== null && this.currentNetwork !== null;
  }

  // Disconnect
  disconnect(): void {
    this.provider = null;
    this.signer = null;
    this.gasFeeManager = null;
    this.rateLimiter = null;
    this.transactionOrchestrator = null;
    this.currentNetwork = null;
  }
}

// Export singleton instance
export const web3Service = new Web3Service();

// Export for use in components
export default web3Service;
