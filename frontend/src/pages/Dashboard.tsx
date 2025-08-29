import React, { useState, useEffect } from 'react';
import { 
  Property, 
  User, 
  Transaction, 
  Notification, 
  ReferralReward,
  TransactionQueueStats,
  PerformanceMetrics,
  Priority
} from '../types';
import web3Service from '../services/web3.ts';
import WalletConnection from '../components/wallet/WalletConnection.tsx';
import PropertyCard from '../components/property/PropertyCard.tsx';
import InvestmentModal from '../components/investment/InvestmentModal.tsx';
import Button from '../components/common/Button.tsx';
import Card from '../components/common/Card.tsx';
import { 
  Home, 
  TrendingUp, 
  Wallet, 
  Bell, 
  Settings, 
  Search,
  Filter,
  Grid,
  List,
  Plus,
  DollarSign,
  Users,
  BarChart3,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [referralRewards, setReferralRewards] = useState<ReferralReward[]>([]);
  const [queueStats, setQueueStats] = useState<TransactionQueueStats | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showInvestmentModal, setShowInvestmentModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load user data
      await loadUserData();
      
      // Load properties
      await loadProperties();
      
      // Load transactions
      await loadTransactions();
      
      // Load notifications
      await loadNotifications();
      
      // Load referral rewards
      await loadReferralRewards();
      
      // Load smart contract stats
      await loadSmartContractStats();
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async () => {
    // Mock user data - in real app, this would come from API
    const mockUser: User = {
      id: '1',
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      kycStatus: 'APPROVED' as any,
      kycDocuments: [],
      referralCode: 'JOHN123',
      totalInvested: 50000,
      totalProperties: 3,
      referralRewards: 250,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setUser(mockUser);
  };

  const loadProperties = async () => {
    // Mock properties data - in real app, this would come from API
    const mockProperties: Property[] = [
      {
        id: '1',
        title: 'Luxury Downtown Condo',
        description: 'Modern 2-bedroom condo in the heart of downtown',
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          country: 'USA',
          postalCode: '10001'
        },
        price: 750000,
        priceInCrypto: {
          ethereum: 0.5,
          usdc: 750000,
          usdt: 750000
        },
        propertyType: 'RESIDENTIAL' as any,
        squareFootage: 1200,
        bedrooms: 2,
        bathrooms: 2,
        yearBuilt: 2020,
        images: ['https://images.unsplash.com/photo-1554995207-c18c203602cb?w=400&h=300&fit=crop&auto=format'],
        features: ['Balcony', 'Gym', 'Pool'],
        investmentType: 'FRACTIONAL' as any,
        status: 'AVAILABLE' as any,
        totalInvestors: 15,
        totalInvested: 450000,
        availableShares: 40,
        totalShares: 100,
        expectedROI: 8.5,
        expectedRentalYield: 6.2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '2',
        title: 'Commercial Office Building',
        description: 'Prime office space in business district',
        address: {
          street: '456 Business Ave',
          city: 'Los Angeles',
          state: 'CA',
          country: 'USA',
          postalCode: '90210'
        },
        price: 2500000,
        priceInCrypto: {
          ethereum: 1.67,
          usdc: 2500000,
          usdt: 2500000
        },
        propertyType: 'COMMERCIAL' as any,
        squareFootage: 5000,
        bedrooms: 0,
        bathrooms: 4,
        yearBuilt: 2018,
        images: ['https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop&auto=format'],
        features: ['Parking', 'Security', 'Conference Rooms'],
        investmentType: 'TOKENIZED' as any,
        tokenizationDetails: {
          tokenAddress: '0x123...',
          tokenSymbol: 'PROP2',
          tokenName: 'Commercial Property Token',
          totalSupply: '1000000',
          circulatingSupply: '750000',
          pricePerToken: 2.5,
          blockchain: 'ETHEREUM',
          contractAddress: '0x456...'
        },
        status: 'FUNDING' as any,
        totalInvestors: 45,
        totalInvested: 1800000,
        availableShares: 25,
        totalShares: 100,
        expectedROI: 12.0,
        expectedRentalYield: 8.5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];
    setProperties(mockProperties);
  };

  const loadTransactions = async () => {
    // Mock transactions data
    const mockTransactions: Transaction[] = [
      {
        id: '1',
        userId: '1',
        type: 'PROPERTY_PURCHASE' as any,
        amount: 25000,
        currency: 'USD',
        cryptoAmount: 0.167,
        cryptoCurrency: 'ETH',
        transactionHash: '0xabc...',
        status: 'CONFIRMED' as any,
        gasFees: 0.002,
        platformFees: 125,
        networkFees: 50,
        totalFees: 177,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];
    setTransactions(mockTransactions);
  };

  const loadNotifications = async () => {
    // Mock notifications data
    const mockNotifications: Notification[] = [
      {
        id: '1',
        userId: '1',
        type: 'PROPERTY_PURCHASE' as any,
        title: 'Investment Confirmed',
        message: 'Your investment in Luxury Downtown Condo has been confirmed.',
        read: false,
        createdAt: new Date().toISOString(),
      }
    ];
    setNotifications(mockNotifications);
  };

  const loadReferralRewards = async () => {
    // Mock referral rewards data
    const mockRewards: ReferralReward[] = [
      {
        id: '1',
        referrerId: '1',
        referredUserId: '2',
        amount: 50,
        currency: 'USD',
        status: 'CLAIMED' as any,
        claimedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }
    ];
    setReferralRewards(mockRewards);
  };

  const loadSmartContractStats = async () => {
    try {
      // Load queue stats from RateLimiter contract
      const stats = await web3Service.getQueueStats();
      setQueueStats(stats);

      // Load performance metrics from TransactionOrchestrator contract
      const metrics = await web3Service.getPerformanceMetrics();
      setPerformanceMetrics(metrics);
    } catch (error) {
      console.error('Error loading smart contract stats:', error);
    }
  };

  const handlePropertyView = (property: Property) => {
    // Navigate to property detail page
    console.log('View property:', property);
  };

  const handlePropertyInvest = (property: Property) => {
    setSelectedProperty(property);
    setShowInvestmentModal(true);
  };

  const handlePropertyFavorite = (property: Property) => {
    console.log('Favorite property:', property);
  };

  const handlePropertyShare = (property: Property) => {
    console.log('Share property:', property);
  };

  const handleInvestmentSuccess = (transactionHash: string) => {
    console.log('Investment successful:', transactionHash);
    // Refresh data
    loadDashboardData();
  };

  const filteredProperties = properties.filter(property =>
    property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.address.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.address.state.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-secondary-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-secondary-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Home className="w-8 h-8 text-primary-600" />
              <h1 className="text-xl font-semibold text-secondary-900">Property Investment Platform</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="p-2 text-secondary-600 hover:text-secondary-900 relative">
                <Bell className="w-6 h-6" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>
              <button className="p-2 text-secondary-600 hover:text-secondary-900">
                <Settings className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section with Wallet Connection */}
        {user && (
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-secondary-900">
                  Welcome back, {user.firstName}!
                </h2>
                <p className="text-secondary-600">
                  Here's what's happening with your investments today.
                </p>
              </div>
              
              {/* Wallet Connection in Welcome Section */}
              <div className="flex-shrink-0">
                <WalletConnection />
              </div>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <div className="flex items-center">
              <div className="p-2 bg-primary-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary-600">Total Invested</p>
                <p className="text-2xl font-bold text-secondary-900">
                  ${user?.totalInvested.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center">
              <div className="p-2 bg-success-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-success-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary-600">Properties Owned</p>
                <p className="text-2xl font-bold text-secondary-900">
                  {user?.totalProperties}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center">
              <div className="p-2 bg-warning-100 rounded-lg">
                <Users className="w-6 h-6 text-warning-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary-600">Referral Rewards</p>
                <p className="text-2xl font-bold text-secondary-900">
                  ${user?.referralRewards}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center">
              <div className="p-2 bg-secondary-100 rounded-lg">
                <Activity className="w-6 h-6 text-secondary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary-600">Active Investments</p>
                <p className="text-2xl font-bold text-secondary-900">
                  {transactions.filter(t => t.status === 'CONFIRMED').length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Smart Contract Performance */}
        {(queueStats || performanceMetrics) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {queueStats && (
              <Card title="Transaction Queue Status" subtitle="Rate Limiter Performance">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-secondary-50 rounded-lg">
                      <div className="text-2xl font-bold text-secondary-900">{queueStats.totalQueued}</div>
                      <div className="text-sm text-secondary-600">Queued</div>
                    </div>
                    <div className="text-center p-3 bg-success-50 rounded-lg">
                      <div className="text-2xl font-bold text-success-600">{queueStats.totalExecuted}</div>
                      <div className="text-sm text-secondary-600">Executed</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-secondary-600">Success Rate:</span>
                    <span className="font-medium text-success-600">{queueStats.successRate}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-secondary-600">Avg Execution Time:</span>
                    <span className="font-medium">{queueStats.averageExecutionTime}s</span>
                  </div>
                </div>
              </Card>
            )}

            {performanceMetrics && (
              <Card title="System Performance" subtitle="Transaction Orchestrator Metrics">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-primary-50 rounded-lg">
                      <div className="text-2xl font-bold text-primary-600">{performanceMetrics.totalTransactionsProcessed}</div>
                      <div className="text-sm text-secondary-600">Total Processed</div>
                    </div>
                    <div className="text-center p-3 bg-warning-50 rounded-lg">
                      <div className="text-2xl font-bold text-warning-600">{performanceMetrics.totalGasUsed}</div>
                      <div className="text-sm text-secondary-600">Gas Used</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-secondary-600">Success Rate:</span>
                    <span className="font-medium text-success-600">{performanceMetrics.successRate}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-secondary-600">Avg Execution Time:</span>
                    <span className="font-medium">{performanceMetrics.averageExecutionTime}ms</span>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Properties Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-secondary-900">Available Properties</h3>
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-400" />
                <input
                  type="text"
                  placeholder="Search properties..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Filters */}
              <Button variant="secondary" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>

              {/* View Mode */}
              <div className="flex border border-secondary-300 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'text-secondary-600'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'text-secondary-600'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Properties Grid */}
          <div className={`grid gap-8 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3' 
              : 'grid-cols-1'
          }`}>
            {filteredProperties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onView={handlePropertyView}
                onInvest={handlePropertyInvest}
                onFavorite={handlePropertyFavorite}
                onShare={handlePropertyShare}
              />
            ))}
          </div>

          {filteredProperties.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏠</div>
              <h3 className="text-lg font-medium text-secondary-900 mb-2">No properties found</h3>
              <p className="text-secondary-600">Try adjusting your search or filters.</p>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Recent Transactions" subtitle="Your investment activity">
            <div className="space-y-4">
              {transactions.slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${
                      transaction.status === 'CONFIRMED' ? 'bg-success-100' : 'bg-warning-100'
                    }`}>
                      {transaction.status === 'CONFIRMED' ? (
                        <CheckCircle className="w-4 h-4 text-success-600" />
                      ) : (
                        <Clock className="w-4 h-4 text-warning-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-secondary-900">{transaction.type.replace('_', ' ')}</p>
                      <p className="text-sm text-secondary-600">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-secondary-900">
                      ${transaction.amount.toLocaleString()}
                    </p>
                    <p className="text-sm text-secondary-600">
                      {transaction.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Recent Notifications" subtitle="Stay updated">
            <div className="space-y-4">
              {notifications.slice(0, 5).map((notification) => (
                <div key={notification.id} className={`flex items-start space-x-3 p-3 rounded-lg ${
                  notification.read ? 'bg-secondary-50' : 'bg-primary-50'
                }`}>
                  <div className="p-1 bg-primary-100 rounded-full">
                    <Bell className="w-4 h-4 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-secondary-900">{notification.title}</p>
                    <p className="text-sm text-secondary-600">{notification.message}</p>
                    <p className="text-xs text-secondary-500 mt-1">
                      {new Date(notification.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Investment Modal */}
      <InvestmentModal
        isOpen={showInvestmentModal}
        onClose={() => setShowInvestmentModal(false)}
        property={selectedProperty}
        onSuccess={handleInvestmentSuccess}
      />
    </div>
  );
};

export default Dashboard;
