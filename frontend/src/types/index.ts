// Smart Contract Types
export interface GasFeeConfig {
  baseGasPrice: string;
  maxGasPrice: string;
  gasLimit: string;
  priorityFee: string;
  isActive: boolean;
}

export interface TransactionRequest {
  user: string;
  target: string;
  value: string;
  data: string;
  gasLimit: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  tokenAmount: string;
  tokenAddress: string;
  executed: boolean;
  failed: boolean;
  failureReason: string;
  timestamp: string;
}

export interface UserBalance {
  nativeBalance: string;
  tokenBalances: { [tokenAddress: string]: string };
  totalGasFeesPaid: string;
  totalTransactions: string;
}

export interface RateLimit {
  maxTransactionsPerSecond: string;
  maxTransactionsPerMinute: string;
  maxTransactionsPerHour: string;
  maxGasPerSecond: string;
  maxGasPerMinute: string;
  maxGasPerHour: string;
  isActive: boolean;
}

export interface QueuedTransaction {
  id: string;
  user: string;
  target: string;
  gasLimit: string;
  priority: number;
  timestamp: string;
  executed: boolean;
  cancelled: boolean;
  reason: string;
}

export interface UserRate {
  lastTransactionTime: string;
  transactionsThisSecond: string;
  transactionsThisMinute: string;
  transactionsThisHour: string;
  gasUsedThisSecond: string;
  gasUsedThisMinute: string;
  gasUsedThisHour: string;
  totalTransactions: string;
  totalGasUsed: string;
}

export enum Priority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  URGENT = 3,
  CRITICAL = 4,
}

export interface OrchestratedTransaction {
  id: string;
  user: string;
  target: string;
  value: string;
  data: string;
  gasLimit: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  tokenAddress: string;
  tokenAmount: string;
  priority: Priority;
  gasFeesPaid: boolean;
  rateLimitChecked: boolean;
  executed: boolean;
  failed: boolean;
  failureReason: string;
  timestamp: string;
  executionTime: string;
}

// Property Investment Platform Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  address?: Address;
  kycStatus: KYCStatus;
  kycDocuments: KYCDocument[];
  walletAddress?: string;
  referralCode: string;
  referredBy?: string;
  totalInvested: number;
  totalProperties: number;
  referralRewards: number;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export enum KYCStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  NOT_STARTED = 'NOT_STARTED',
}

export interface KYCDocument {
  id: string;
  type: 'ID_CARD' | 'PASSPORT' | 'DRIVERS_LICENSE' | 'SELFIE' | 'PROOF_OF_ADDRESS';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  url: string;
  uploadedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface Property {
  id: string;
  title: string;
  description: string;
  address: Address;
  price: number;
  priceInCrypto: {
    ethereum: number;
    usdc: number;
    usdt: number;
  };
  propertyType: PropertyType;
  squareFootage: number;
  bedrooms: number;
  bathrooms: number;
  yearBuilt: number;
  images: string[];
  features: string[];
  investmentType: InvestmentType;
  tokenizationDetails?: TokenizationDetails;
  status: PropertyStatus;
  totalInvestors: number;
  totalInvested: number;
  availableShares: number;
  totalShares: number;
  expectedROI: number;
  expectedRentalYield: number;
  createdAt: string;
  updatedAt: string;
}

export enum PropertyType {
  RESIDENTIAL = 'RESIDENTIAL',
  COMMERCIAL = 'COMMERCIAL',
  INDUSTRIAL = 'INDUSTRIAL',
  LAND = 'LAND',
  MIXED_USE = 'MIXED_USE',
}

export enum InvestmentType {
  FULL_OWNERSHIP = 'FULL_OWNERSHIP',
  FRACTIONAL = 'FRACTIONAL',
  TOKENIZED = 'TOKENIZED',
}

export enum PropertyStatus {
  AVAILABLE = 'AVAILABLE',
  FUNDING = 'FUNDING',
  FUNDED = 'FUNDED',
  SOLD = 'SOLD',
  OFF_MARKET = 'OFF_MARKET',
}

export interface TokenizationDetails {
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  totalSupply: string;
  circulatingSupply: string;
  pricePerToken: number;
  blockchain: 'ETHEREUM' | 'POLYGON' | 'ALKEBULEUM';
  contractAddress: string;
}

export interface Investment {
  id: string;
  userId: string;
  propertyId: string;
  amount: number;
  shares: number;
  paymentMethod: PaymentMethod;
  transactionHash?: string;
  status: InvestmentStatus;
  createdAt: string;
  updatedAt: string;
}

export enum PaymentMethod {
  CRYPTO = 'CRYPTO',
  FIAT = 'FIAT',
  HYBRID = 'HYBRID',
}

export enum InvestmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  cryptoAmount?: number;
  cryptoCurrency?: string;
  transactionHash?: string;
  status: TransactionStatus;
  gasFees?: number;
  platformFees?: number;
  networkFees?: number;
  totalFees?: number;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  PROPERTY_PURCHASE = 'PROPERTY_PURCHASE',
  REFERRAL_REWARD = 'REFERRAL_REWARD',
  GAS_FEE_PAYMENT = 'GAS_FEE_PAYMENT',
  TOKEN_TRANSFER = 'TOKEN_TRANSFER',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
}

export enum NotificationType {
  KYC_APPROVED = 'KYC_APPROVED',
  KYC_REJECTED = 'KYC_REJECTED',
  PROPERTY_PURCHASE = 'PROPERTY_PURCHASE',
  REFERRAL_REWARD = 'REFERRAL_REWARD',
  WALLET_CONNECTED = 'WALLET_CONNECTED',
  TRANSACTION_CONFIRMED = 'TRANSACTION_CONFIRMED',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
}

export interface ReferralReward {
  id: string;
  referrerId: string;
  referredUserId: string;
  amount: number;
  currency: string;
  status: RewardStatus;
  claimedAt?: string;
  createdAt: string;
}

export enum RewardStatus {
  PENDING = 'PENDING',
  CLAIMED = 'CLAIMED',
  EXPIRED = 'EXPIRED',
}

export interface WalletConnection {
  address: string;
  network: 'ETHEREUM' | 'POLYGON' | 'ALKEBULEUM' | 'SEPOLIA';
  chainId: number;
  connected: boolean;
  balance: {
    native: string;
    tokens: { [symbol: string]: string };
  };
}

export interface FiatOnRamp {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  cryptoAmount: number;
  cryptoCurrency: string;
  paymentMethod: 'CREDIT_CARD' | 'BANK_TRANSFER' | 'MOBILE_MONEY';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  provider: 'STRIPE' | 'MOONPAY' | 'RAMP' | 'WYRE';
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Form Types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  referralCode?: string;
  acceptTerms: boolean;
}

export interface KYCForm {
  dateOfBirth: string;
  address: Address;
  documents: {
    idCard?: File;
    passport?: File;
    selfie?: File;
    proofOfAddress?: File;
  };
}

export interface PropertySearchFilters {
  minPrice?: number;
  maxPrice?: number;
  propertyType?: PropertyType[];
  investmentType?: InvestmentType[];
  location?: string;
  bedrooms?: number;
  bathrooms?: number;
  sortBy?: 'price' | 'date' | 'roi' | 'yield';
  sortOrder?: 'asc' | 'desc';
}

// Component Props Types
export interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnOverlayClick?: boolean;
}

export interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  pagination?: boolean;
  searchable?: boolean;
  sortable?: boolean;
  onRowClick?: (item: T) => void;
  className?: string;
}

export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (value: any, item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

// Smart Contract Integration Types
export interface ContractConfig {
  address: string;
  abi: any[];
  network: string;
  chainId: number;
}

export interface GasFeeEstimate {
  gasLimit: string;
  gasPrice: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  totalCost: string;
  breakdown: {
    gasCost: string;
    platformFee: string;
    networkFee: string;
    total: string;
  };
}

export interface TransactionQueueStats {
  totalQueued: string;
  totalExecuted: string;
  totalFailed: string;
  averageExecutionTime: string;
  successRate: string;
  queueByPriority: {
    [key in Priority]: string;
  };
}

export interface PerformanceMetrics {
  totalTransactionsProcessed: string;
  totalGasUsed: string;
  averageExecutionTime: string;
  successRate: string;
  throughput: {
    transactionsPerSecond: string;
    gasPerSecond: string;
  };
}
