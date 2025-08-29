import React, { useState, useEffect } from 'react';
import { Property, PaymentMethod, Priority } from '../../types/index.ts';
import web3Service from '../../services/web3.ts';
import Modal from '../common/Modal.tsx';
import Button from '../common/Button.tsx';
import { 
  DollarSign, 
  CreditCard, 
  Wallet, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Info
} from 'lucide-react';

interface InvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property | null;
  onSuccess?: (transactionHash: string) => void;
}

const InvestmentModal: React.FC<InvestmentModalProps> = ({
  isOpen,
  onClose,
  property,
  onSuccess,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CRYPTO);
  const [investmentAmount, setInvestmentAmount] = useState<string>('');
  const [cryptoAmount, setCryptoAmount] = useState<string>('');
  const [selectedCrypto, setSelectedCrypto] = useState<'ETH' | 'USDC' | 'USDT'>('ETH');
  const [priority, setPriority] = useState<Priority>(Priority.NORMAL);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gasEstimate, setGasEstimate] = useState<any>(null);

  useEffect(() => {
    if (property && investmentAmount) {
      calculateCryptoAmount();
      estimateGasFees();
    }
  }, [property, investmentAmount, selectedCrypto, priority]);

  const calculateCryptoAmount = () => {
    if (!property || !investmentAmount) return;

    const amount = parseFloat(investmentAmount);
    if (isNaN(amount)) return;

    let cryptoValue = 0;
    switch (selectedCrypto) {
      case 'ETH':
        cryptoValue = amount / property.priceInCrypto.ethereum;
        break;
      case 'USDC':
        cryptoValue = amount / property.priceInCrypto.usdc;
        break;
      case 'USDT':
        cryptoValue = amount / property.priceInCrypto.usdt;
        break;
    }

    setCryptoAmount(cryptoValue.toFixed(6));
  };

  const estimateGasFees = async () => {
    if (!property || !investmentAmount) return;

    try {
      // Mock gas estimation - in real implementation, this would call the smart contract
      const estimate = await web3Service.estimateGasFees(
        '0x...', // Property contract address
        '0', // Value
        '0x', // Data
        priority
      );
      setGasEstimate(estimate);
    } catch (error) {
      console.error('Error estimating gas fees:', error);
    }
  };

  const handleInvestment = async () => {
    if (!property || !investmentAmount) return;

    setIsProcessing(true);
    setError(null);

    try {
      let transactionHash = '';

      if (paymentMethod === PaymentMethod.CRYPTO) {
        // Use smart contract orchestration for crypto payment
        transactionHash = await web3Service.orchestrateTransaction(
          '0x...', // Property contract address
          '0', // Value
          '0x', // Investment data
          gasEstimate?.gasLimit || '21000',
          gasEstimate?.maxFeePerGas || '20000000000',
          gasEstimate?.maxPriorityFeePerGas || '1500000000',
          '0x0000000000000000000000000000000000000000', // Native token
          '0',
          priority
        );
      } else {
        // Handle fiat payment through backend
        // This would integrate with payment processors like Stripe
        const response = await fetch('/api/investments/fiat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            propertyId: property.id,
            amount: parseFloat(investmentAmount),
            paymentMethod: 'credit_card', // or 'bank_transfer', 'mobile_money'
          }),
        });

        if (!response.ok) {
          throw new Error('Fiat payment failed');
        }

        const result = await response.json();
        transactionHash = result.transactionHash;
      }

      onSuccess?.(transactionHash);
      onClose();
    } catch (error) {
      console.error('Investment error:', error);
      setError('Investment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatCrypto = (amount: string, symbol: string) => {
    return `${parseFloat(amount).toFixed(6)} ${symbol}`;
  };

  const getPriorityLabel = (priority: Priority) => {
    switch (priority) {
      case Priority.LOW:
        return 'Low Priority';
      case Priority.NORMAL:
        return 'Normal Priority';
      case Priority.HIGH:
        return 'High Priority';
      case Priority.URGENT:
        return 'Urgent Priority';
      case Priority.CRITICAL:
        return 'Critical Priority';
      default:
        return 'Normal Priority';
    }
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case Priority.LOW:
        return 'text-secondary-600';
      case Priority.NORMAL:
        return 'text-primary-600';
      case Priority.HIGH:
        return 'text-warning-600';
      case Priority.URGENT:
        return 'text-error-600';
      case Priority.CRITICAL:
        return 'text-error-700';
      default:
        return 'text-primary-600';
    }
  };

  if (!property) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invest in Property"
      size="lg"
    >
      <div className="space-y-6">
        {/* Property Summary */}
        <div className="bg-secondary-50 rounded-lg p-4">
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 bg-secondary-200 rounded-lg flex items-center justify-center">
              <div className="text-2xl">🏠</div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-secondary-900">{property.title}</h3>
              <p className="text-sm text-secondary-600">
                {property.address.city}, {property.address.state}
              </p>
              <div className="flex items-center space-x-4 mt-2 text-sm">
                <span className="text-secondary-600">
                  {property.bedrooms} beds • {property.bathrooms} baths
                </span>
                <span className="text-success-600 font-medium">
                  {property.expectedROI.toFixed(1)}% ROI
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-secondary-900">
                {formatCurrency(property.price)}
              </div>
              <div className="text-sm text-secondary-600">Total Price</div>
            </div>
          </div>
        </div>

        {/* Investment Amount */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            Investment Amount (USD)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <DollarSign className="h-5 w-5 text-secondary-400" />
            </div>
            <input
              type="number"
              value={investmentAmount}
              onChange={(e) => setInvestmentAmount(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Enter amount"
              min="0"
              step="0.01"
            />
          </div>
          {investmentAmount && (
            <p className="mt-1 text-sm text-secondary-600">
              You'll receive approximately {((parseFloat(investmentAmount) / property.price) * 100).toFixed(2)}% ownership
            </p>
          )}
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-3">
            Payment Method
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentMethod(PaymentMethod.CRYPTO)}
              className={`p-4 border rounded-lg text-left transition-colors ${
                paymentMethod === PaymentMethod.CRYPTO
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-secondary-300 hover:border-secondary-400'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Wallet className="w-5 h-5 text-primary-600" />
                <span className="font-medium">Crypto Payment</span>
              </div>
              <p className="text-sm text-secondary-600 mt-1">
                Pay with ETH, USDC, or USDT
              </p>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod(PaymentMethod.FIAT)}
              className={`p-4 border rounded-lg text-left transition-colors ${
                paymentMethod === PaymentMethod.FIAT
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-secondary-300 hover:border-secondary-400'
              }`}
            >
              <div className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-primary-600" />
                <span className="font-medium">Fiat Payment</span>
              </div>
              <p className="text-sm text-secondary-600 mt-1">
                Pay with card or bank transfer
              </p>
            </button>
          </div>
        </div>

        {/* Crypto Payment Details */}
        {paymentMethod === PaymentMethod.CRYPTO && (
          <div className="space-y-4">
            {/* Crypto Selection */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Select Cryptocurrency
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['ETH', 'USDC', 'USDT'] as const).map((crypto) => (
                  <button
                    key={crypto}
                    type="button"
                    onClick={() => setSelectedCrypto(crypto)}
                    className={`p-3 border rounded-lg text-center transition-colors ${
                      selectedCrypto === crypto
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-secondary-300 hover:border-secondary-400'
                    }`}
                  >
                    <div className="font-medium">{crypto}</div>
                    <div className="text-sm text-secondary-600">
                      {cryptoAmount ? formatCrypto(cryptoAmount, crypto) : '0.000000'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Transaction Priority */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Transaction Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value) as Priority)}
                className="block w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value={Priority.LOW}>Low Priority (Lower fees)</option>
                <option value={Priority.NORMAL}>Normal Priority</option>
                <option value={Priority.HIGH}>High Priority (Faster)</option>
                <option value={Priority.URGENT}>Urgent Priority</option>
                <option value={Priority.CRITICAL}>Critical Priority</option>
              </select>
            </div>

            {/* Gas Fee Estimate */}
            {gasEstimate && (
              <div className="bg-secondary-50 rounded-lg p-4">
                <h4 className="font-medium text-secondary-900 mb-2">Transaction Cost Breakdown</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-secondary-600">Gas Cost:</span>
                    <span className="font-medium">{formatCrypto(gasEstimate.breakdown.gasCost, 'ETH')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary-600">Platform Fee:</span>
                    <span className="font-medium">{formatCrypto(gasEstimate.breakdown.platformFee, 'ETH')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary-600">Network Fee:</span>
                    <span className="font-medium">{formatCrypto(gasEstimate.breakdown.networkFee, 'ETH')}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Total Cost:</span>
                    <span>{formatCrypto(gasEstimate.breakdown.total, 'ETH')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Fiat Payment Details */}
        {paymentMethod === PaymentMethod.FIAT && (
          <div className="bg-secondary-50 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-secondary-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-secondary-900">Fiat Payment Processing</h4>
                <p className="text-sm text-secondary-600 mt-1">
                  Your fiat payment will be converted to crypto and processed through our smart contracts. 
                  You'll receive a confirmation once the transaction is complete.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Investment Summary */}
        <div className="bg-primary-50 rounded-lg p-4">
          <h4 className="font-medium text-primary-900 mb-3">Investment Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-primary-700">Investment Amount:</span>
              <span className="font-medium">{formatCurrency(parseFloat(investmentAmount) || 0)}</span>
            </div>
            {paymentMethod === PaymentMethod.CRYPTO && cryptoAmount && (
              <div className="flex justify-between">
                <span className="text-primary-700">Crypto Amount:</span>
                <span className="font-medium">{formatCrypto(cryptoAmount, selectedCrypto)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-primary-700">Ownership Percentage:</span>
              <span className="font-medium">
                {investmentAmount ? ((parseFloat(investmentAmount) / property.price) * 100).toFixed(2) : '0'}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-primary-700">Expected Annual Return:</span>
              <span className="font-medium text-success-600">
                {formatCurrency((parseFloat(investmentAmount) || 0) * (property.expectedROI / 100))}
              </span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-error-50 border border-error-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-error-600" />
              <span className="text-sm text-error-700">{error}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            size="lg"
            onClick={onClose}
            className="flex-1"
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={handleInvestment}
            loading={isProcessing}
            disabled={!investmentAmount || parseFloat(investmentAmount) <= 0}
            className="flex-1"
          >
            {isProcessing ? 'Processing...' : 'Confirm Investment'}
          </Button>
        </div>

        {/* Processing Status */}
        {isProcessing && (
          <div className="bg-secondary-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-secondary-600 animate-spin" />
              <div>
                <h4 className="font-medium text-secondary-900">Processing Investment</h4>
                <p className="text-sm text-secondary-600">
                  Please wait while we process your investment. This may take a few minutes.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default InvestmentModal;
