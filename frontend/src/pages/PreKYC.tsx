import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button.tsx';
import { 
  Wallet, 
  Shield, 
  FileText, 
  CheckCircle, 
  ArrowRight, 
  User, 
  Mail, 
  Phone, 
  MapPin,
  Info,
  AlertCircle
} from 'lucide-react';

const PreKYC: React.FC = () => {
  const navigate = useNavigate();
  const [walletConnected, setWalletConnected] = useState(false);

  const handleConnectWallet = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        setWalletConnected(true);
      } else {
        alert('Please install MetaMask to connect your wallet');
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const handleProceedToKYC = () => {
    navigate('/kyc');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-secondary-900">Welcome Home Property</h1>
                <p className="text-sm text-secondary-600">Blockchain Real Estate Investment Platform</p>
              </div>
            </div>
            <Button 
              variant="secondary" 
              onClick={() => navigate('/')}
              className="flex items-center space-x-2"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              <span>Back to Home</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12 space-y-12">
        {/* Welcome Section */}
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-bold text-secondary-900">
            Get Started with KYC Verification
          </h2>
          <p className="text-xl text-secondary-600 max-w-2xl mx-auto">
            Before you can start investing in real estate, we need to verify your identity. 
            This ensures compliance with regulations and protects all users on our platform.
          </p>
        </div>

        {/* Wallet Setup Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center space-x-3 mb-6">
            <Wallet className="w-8 h-8 text-primary-600" />
            <h3 className="text-2xl font-bold text-secondary-900">Step 1: Connect Your Wallet</h3>
          </div>
          
          <div className="space-y-4">
            <p className="text-secondary-700">
              You'll need a Web3 wallet to interact with our blockchain-based platform. 
              We recommend MetaMask for the best experience.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900">Don't have MetaMask?</h4>
                  <p className="text-blue-800 text-sm mt-1">
                    Visit <a href="https://metamask.io" target="_blank" rel="noopener noreferrer" className="underline">metamask.io</a> to download and install the browser extension.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border border-secondary-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${walletConnected ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className={walletConnected ? 'text-green-700 font-medium' : 'text-secondary-700'}>
                  {walletConnected ? 'Wallet Connected' : 'Wallet Not Connected'}
                </span>
              </div>
              <Button 
                variant={walletConnected ? "secondary" : "primary"}
                onClick={handleConnectWallet}
                disabled={walletConnected}
                className="flex items-center space-x-2"
              >
                {walletConnected ? <CheckCircle className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
                <span>{walletConnected ? 'Connected' : 'Connect Wallet'}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* KYC Requirements Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center space-x-3 mb-6">
            <FileText className="w-8 h-8 text-primary-600" />
            <h3 className="text-2xl font-bold text-secondary-900">Step 2: Prepare Your Documents</h3>
          </div>
          
          <div className="space-y-6">
            <p className="text-secondary-700">
              To complete KYC verification, you'll need to provide the following documents:
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-secondary-900">Required Documents:</h4>
                <ul className="space-y-3">
                  <li className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <span className="font-medium">Government-issued ID</span>
                      <p className="text-sm text-secondary-600">Passport, driver's license, or national ID card</p>
                    </div>
                  </li>
                  <li className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <span className="font-medium">Proof of Address</span>
                      <p className="text-sm text-secondary-600">Utility bill, bank statement (within 3 months)</p>
                    </div>
                  </li>
                  <li className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <span className="font-medium">Selfie Photo</span>
                      <p className="text-sm text-secondary-600">Clear photo of yourself holding your ID</p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-secondary-900">Document Guidelines:</h4>
                <ul className="space-y-2 text-sm text-secondary-600">
                  <li>• High-quality, clear images</li>
                  <li>• All text must be readable</li>
                  <li>• No glare or shadows</li>
                  <li>• Documents must be valid and not expired</li>
                  <li>• Files should be under 10MB each</li>
                  <li>• Accepted formats: JPG, PNG, PDF</li>
                </ul>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-900">Processing Time</h4>
                  <p className="text-yellow-800 text-sm mt-1">
                    KYC verification typically takes 1-3 business days. You'll receive an email notification once approved.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center space-x-3 mb-6">
            <User className="w-8 h-8 text-primary-600" />
            <h3 className="text-2xl font-bold text-secondary-900">About Welcome Home Property</h3>
          </div>
          
          <div className="space-y-4">
            <p className="text-secondary-700">
              Welcome Home Property is a revolutionary blockchain-based platform that democratizes real estate investment. 
              We enable fractional ownership of premium properties through tokenization, making real estate investment 
              accessible to everyone.
            </p>
            
            <div className="grid md:grid-cols-3 gap-6 mt-8">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto">
                  <Shield className="w-8 h-8 text-primary-600" />
                </div>
                <h4 className="font-semibold text-secondary-900">Secure & Compliant</h4>
                <p className="text-sm text-secondary-600">Full regulatory compliance and bank-level security</p>
              </div>
              
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto">
                  <FileText className="w-8 h-8 text-primary-600" />
                </div>
                <h4 className="font-semibold text-secondary-900">Transparent</h4>
                <p className="text-sm text-secondary-600">Blockchain technology ensures complete transparency</p>
              </div>
              
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto">
                  <Wallet className="w-8 h-8 text-primary-600" />
                </div>
                <h4 className="font-semibold text-secondary-900">Accessible</h4>
                <p className="text-sm text-secondary-600">Start investing with as little as $100</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center space-x-3 mb-6">
            <Mail className="w-8 h-8 text-primary-600" />
            <h3 className="text-2xl font-bold text-secondary-900">Contact & Support</h3>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="font-semibold text-secondary-900">Get in Touch</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-secondary-500" />
                  <div>
                    <p className="font-medium">Email Support</p>
                    <a href="mailto:support@welcomehomeproperty.com" className="text-primary-600 hover:text-primary-700">
                      support@welcomehomeproperty.com
                    </a>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-secondary-500" />
                  <div>
                    <p className="font-medium">Phone Support</p>
                    <a href="tel:+1-800-WELCOME" className="text-primary-600 hover:text-primary-700">
                      +1 (800) WELCOME
                    </a>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-secondary-500" />
                  <div>
                    <p className="font-medium">Office Address</p>
                    <p className="text-secondary-600">
                      123 Blockchain Avenue<br />
                      Digital City, DC 12345
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-semibold text-secondary-900">Support Hours</h4>
              <div className="space-y-2 text-secondary-600">
                <p><span className="font-medium">Monday - Friday:</span> 9:00 AM - 6:00 PM EST</p>
                <p><span className="font-medium">Saturday:</span> 10:00 AM - 4:00 PM EST</p>
                <p><span className="font-medium">Sunday:</span> Closed</p>
              </div>
              
              <div className="mt-6">
                <h4 className="font-semibold text-secondary-900 mb-2">Need Help?</h4>
                <p className="text-secondary-600 text-sm mb-4">
                  Our support team is here to help you through the KYC process and answer any questions.
                </p>
                <Button variant="secondary" className="w-full">
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Support
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Testing Navigation Links */}
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6">
          <div className="flex items-center space-x-2 mb-4">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <h3 className="text-lg font-semibold text-yellow-900">Development Testing Links</h3>
          </div>
          <p className="text-yellow-800 text-sm mb-4">
            Temporary navigation for testing - these will be removed in production
          </p>
          <div className="flex flex-wrap gap-3">
            <Button 
              variant="secondary" 
              onClick={() => navigate('/kyc')}
              className="flex items-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>Go to KYC Page</span>
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-2"
            >
              <User className="w-4 h-4" />
              <span>Go to Dashboard</span>
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => navigate('/wallet')}
              className="flex items-center space-x-2"
            >
              <Wallet className="w-4 h-4" />
              <span>Go to Wallet</span>
            </Button>
          </div>
        </div>

        {/* Proceed Button */}
        <div className="text-center">
          <Button 
            variant="primary" 
            size="lg"
            onClick={handleProceedToKYC}
            disabled={!walletConnected}
            className="px-8 py-4 text-lg"
          >
            <span>Proceed to KYC Verification</span>
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          
          {!walletConnected && (
            <p className="text-sm text-secondary-500 mt-2">
              Please connect your wallet to proceed
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreKYC;
