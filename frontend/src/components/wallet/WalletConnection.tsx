import React, { useState, useEffect } from 'react';
import { WalletConnection as WalletConnectionType } from '../../types/index.ts';
import web3Service, { NETWORKS as Web3Networks } from '../../services/web3.ts';
import Button from '../common/Button.tsx';
import Card from '../common/Card.tsx';
import { Wallet, ChevronDown, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface WalletConnectionProps {
  onConnect?: (connection: WalletConnectionType) => void;
  onDisconnect?: () => void;
  className?: string;
}

const WalletConnection: React.FC<WalletConnectionProps> = ({
  onConnect,
  onDisconnect,
  className = '',
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connection, setConnection] = useState<WalletConnectionType | null>(null);
  const [showNetworkSelector, setShowNetworkSelector] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('0');

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const connected = web3Service.isConnected();
      setIsConnected(connected);
      
      if (connected) {
        const walletConnection = web3Service.getWalletConnection();
        if (walletConnection) {
          setConnection(walletConnection);
          onConnect?.(walletConnection);
          await fetchBalance();
        }
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const fetchBalance = async () => {
    try {
      if (connection?.address) {
        // This would fetch the actual balance from the blockchain
        // For now, we'll use a placeholder
        setBalance('0.0');
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const connectWallet = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const success = await web3Service.initialize();
      
      if (success) {
        const walletConnection = web3Service.getWalletConnection();
        if (walletConnection) {
          setConnection(walletConnection);
          setIsConnected(true);
          onConnect?.(walletConnection);
          await fetchBalance();
        }
      } else {
        setError('Failed to connect wallet. Please make sure MetaMask is installed and unlocked.');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setError('Failed to connect wallet. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    web3Service.disconnect();
    setConnection(null);
    setIsConnected(false);
    setBalance('0');
    onDisconnect?.();
  };

  const switchNetwork = async (chainId: number) => {
    try {
      const success = await web3Service.switchNetwork(chainId);
      if (success) {
        const walletConnection = web3Service.getWalletConnection();
        if (walletConnection) {
          setConnection(walletConnection);
          await fetchBalance();
        }
      }
      setShowNetworkSelector(false);
    } catch (error) {
      console.error('Error switching network:', error);
      setError('Failed to switch network. Please try again.');
    }
  };

  const getNetworkIcon = (networkName: string) => {
    switch (networkName) {
      case 'ETHEREUM':
        return '🔵';
      case 'POLYGON':
        return '🟣';
      case 'ALKEBULEUM':
        return '🟡';
      case 'SEPOLIA':
        return '🟢';
      default:
        return '⚫';
    }
  };

  const getNetworkColor = (networkName: string) => {
    switch (networkName) {
      case 'ETHEREUM':
        return 'text-blue-600';
      case 'POLYGON':
        return 'text-purple-600';
      case 'ALKEBULEUM':
        return 'text-yellow-600';
      case 'SEPOLIA':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  if (isConnected && connection) {
    return (
      <Card className={className}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-primary-100 rounded-full">
              <Wallet className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-secondary-900">
                {connection.address.slice(0, 6)}...{connection.address.slice(-4)}
              </p>
              <div className="flex items-center space-x-2">
                <span className={`text-xs font-medium ${getNetworkColor(connection.network)}`}>
                  {getNetworkIcon(connection.network)} {connection.network}
                </span>
                <CheckCircle className="w-3 h-3 text-success-500" />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="text-right">
              <p className="text-sm font-medium text-secondary-900">
                {balance} {Web3Networks[connection.network]?.nativeCurrency?.symbol || 'ETH'}
              </p>
              <button
                onClick={fetchBalance}
                className="text-xs text-secondary-500 hover:text-secondary-700"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>

            <div className="relative">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowNetworkSelector(!showNetworkSelector)}
              >
                <ChevronDown className="w-4 h-4" />
              </Button>

              {showNetworkSelector && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-large border border-secondary-200 z-10">
                  <div className="py-1">
                    {Object.entries(Web3Networks).map(([key, network]) => (
                      <button
                        key={network.chainId}
                        onClick={() => switchNetwork(network.chainId)}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-secondary-50 flex items-center space-x-2 ${
                          connection.chainId === network.chainId ? 'bg-primary-50 text-primary-700' : 'text-secondary-700'
                        }`}
                      >
                        <span>{getNetworkIcon(key)}</span>
                        <span>{network.name}</span>
                        {connection.chainId === network.chainId && (
                          <CheckCircle className="w-4 h-4 ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={disconnectWallet}
            >
              Disconnect
            </Button>
          </div>
        </div>

        {/* Smart Contract Integration Status */}
        <div className="mt-4 pt-4 border-t border-secondary-200">
          <h4 className="text-sm font-medium text-secondary-900 mb-2">Smart Contract Status</h4>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div className="flex items-center space-x-1">
              <CheckCircle className="w-3 h-3 text-success-500" />
              <span className="text-secondary-600">Gas Fee Manager</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="w-3 h-3 text-success-500" />
              <span className="text-secondary-600">Rate Limiter</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="w-3 h-3 text-success-500" />
              <span className="text-secondary-600">Orchestrator</span>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <div className="text-center">
        <div className="flex items-center justify-center w-12 h-12 bg-secondary-100 rounded-full mx-auto mb-4">
          <Wallet className="w-6 h-6 text-secondary-600" />
        </div>
        
        <h3 className="text-lg font-semibold text-secondary-900 mb-2">
          Connect Your Wallet
        </h3>
        
        <p className="text-sm text-secondary-600 mb-6">
          Connect your wallet to access the Property Investment Platform and manage your investments
        </p>

        {error && (
          <div className="mb-4 p-3 text-sm text-error-700 bg-error-50 border border-error-200 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <Button
          variant="primary"
          size="lg"
          loading={isConnecting}
          onClick={connectWallet}
          className="w-full"
        >
          {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
        </Button>

        <div className="mt-4 text-xs text-secondary-500">
          <p>Supported Networks:</p>
          <div className="flex justify-center space-x-4 mt-1">
            {Object.entries(Web3Networks).map(([key, network]) => (
              <span key={network.chainId} className="flex items-center space-x-1">
                <span>{getNetworkIcon(key)}</span>
                <span>{network.name}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default WalletConnection;
