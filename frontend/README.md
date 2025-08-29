# Property Investment Platform Frontend

A modern, responsive React application for property investment with integrated smart contracts, supporting both fiat and crypto payments.

## 🚀 Features

### Core Functionality
- **User Authentication & KYC**: Complete user registration, login, and KYC verification flow
- **Wallet Integration**: MetaMask and WalletConnect support with multi-network compatibility
- **Property Marketplace**: Browse, search, and filter available properties
- **Investment Management**: Invest in properties using crypto or fiat payments
- **Smart Contract Integration**: Seamless integration with GasFeeManager, RateLimiter, and TransactionOrchestrator contracts
- **Real-time Notifications**: Stay updated on investment status and platform activities
- **Referral System**: Earn rewards by referring new users

### Smart Contract Features
- **Gas Fee Management**: Automated gas fee calculation and payment through smart contracts
- **Rate Limiting**: Transaction queue management with priority levels
- **Transaction Orchestration**: Unified transaction processing with performance monitoring
- **Multi-Network Support**: Ethereum, Polygon, Alkebuleum, and Sepolia networks
- **Batch Processing**: Execute multiple transactions efficiently

### Payment Options
- **Crypto Payments**: ETH, USDC, USDT with real-time conversion rates
- **Fiat On-Ramp**: Credit card, bank transfer, and mobile money integration
- **Hybrid Payments**: Combine crypto and fiat for flexible investment options

### UI/UX Features
- **Modern Design**: Clean, professional interface with Tailwind CSS
- **Responsive Layout**: Optimized for desktop, tablet, and mobile devices
- **Dark/Light Mode**: Theme switching capability
- **Real-time Updates**: Live data updates and transaction status
- **Accessibility**: WCAG compliant with keyboard navigation support

## 🛠️ Technology Stack

### Frontend
- **React 18**: Modern React with hooks and functional components
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **React Router**: Client-side routing
- **React Query**: Server state management
- **React Hook Form**: Form handling and validation
- **Lucide React**: Beautiful icons

### Web3 Integration
- **Ethers.js**: Ethereum library for smart contract interaction
- **Web3-React**: React hooks for Ethereum
- **MetaMask**: Wallet connection and transaction signing
- **WalletConnect**: Mobile wallet support

### Development Tools
- **Vite**: Fast build tool and development server
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **TypeScript**: Static type checking

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- MetaMask browser extension
- Access to Ethereum networks (mainnet, testnets)

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   REACT_APP_API_URL=http://localhost:3001
   REACT_APP_INFURA_KEY=your_infura_key
   REACT_APP_ALCHEMY_KEY=your_alchemy_key
   REACT_APP_STRIPE_PUBLIC_KEY=your_stripe_key
   REACT_APP_MOONPAY_KEY=your_moonpay_key
   ```

4. **Start the development server**
   ```bash
   npm start
   # or
   yarn start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🏗️ Project Structure

```
frontend/
├── public/                 # Static assets
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── auth/          # Authentication components
│   │   ├── common/        # Shared components (Button, Card, Modal)
│   │   ├── investment/    # Investment-related components
│   │   ├── property/      # Property display components
│   │   └── wallet/        # Wallet connection components
│   ├── pages/             # Page components
│   ├── services/          # API and Web3 services
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   ├── hooks/             # Custom React hooks
│   ├── App.tsx            # Main application component
│   └── index.tsx          # Application entry point
├── package.json           # Dependencies and scripts
├── tailwind.config.js     # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
└── README.md              # This file
```

## 🔧 Configuration

### Smart Contract Addresses
Update contract addresses in `src/services/web3.ts`:
```typescript
const CONTRACT_ADDRESSES = {
  [NETWORKS.ETHEREUM.chainId]: {
    gasFeeManager: '0x...',
    rateLimiter: '0x...',
    transactionOrchestrator: '0x...'
  },
  // ... other networks
};
```

### Network Configuration
Configure supported networks in `src/services/web3.ts`:
```typescript
export const NETWORKS = {
  ETHEREUM: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
    // ...
  },
  // ... other networks
};
```

### API Endpoints
Configure API endpoints in environment variables:
```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_AUTH_API=/api/auth
REACT_APP_PROPERTIES_API=/api/properties
REACT_APP_INVESTMENTS_API=/api/investments
```

## 🚀 Usage

### User Registration
1. Navigate to the registration page
2. Fill in personal information
3. Complete KYC verification
4. Connect wallet (optional)

### Property Investment
1. Browse available properties
2. Select a property to invest in
3. Choose payment method (crypto or fiat)
4. Enter investment amount
5. Review transaction details
6. Confirm investment

### Wallet Connection
1. Click "Connect Wallet" button
2. Choose MetaMask or WalletConnect
3. Approve connection in wallet
4. Select preferred network
5. View wallet balance and transaction history

### Smart Contract Interaction
The platform automatically handles:
- Gas fee estimation and payment
- Transaction queuing and execution
- Rate limiting and priority management
- Batch processing for efficiency

## 🔒 Security Features

### Smart Contract Security
- **Access Control**: Role-based permissions for contract functions
- **Reentrancy Protection**: Guards against reentrancy attacks
- **Pausable Contracts**: Emergency pause functionality
- **Input Validation**: Comprehensive parameter validation

### Frontend Security
- **Input Sanitization**: All user inputs are validated and sanitized
- **XSS Protection**: React's built-in XSS protection
- **CSRF Protection**: Token-based CSRF protection
- **Secure Storage**: Sensitive data stored securely

### Wallet Security
- **Transaction Confirmation**: All transactions require user approval
- **Network Validation**: Automatic network detection and validation
- **Gas Limit Protection**: Prevents excessive gas consumption
- **Error Handling**: Comprehensive error handling and user feedback

## 📱 Responsive Design

The application is fully responsive and optimized for:
- **Desktop**: Full-featured experience with advanced controls
- **Tablet**: Touch-optimized interface with simplified navigation
- **Mobile**: Streamlined interface with essential features

## 🧪 Testing

### Running Tests
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

### Test Coverage
```bash
npm run test:coverage
```

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Environment Variables for Production
```env
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_INFURA_KEY=your_production_infura_key
REACT_APP_ALCHEMY_KEY=your_production_alchemy_key
NODE_ENV=production
```

### Deployment Platforms
- **Vercel**: Zero-config deployment
- **Netlify**: Static site hosting
- **AWS S3**: Scalable cloud hosting
- **Firebase**: Google's hosting platform

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

### Code Standards
- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write comprehensive tests
- Document new features and APIs

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [API Documentation](docs/api.md)
- [Smart Contract Documentation](docs/contracts.md)
- [Deployment Guide](docs/deployment.md)

### Community
- [Discord](https://discord.gg/your-community)
- [Telegram](https://t.me/your-community)
- [Twitter](https://twitter.com/your-handle)

### Issues
Report bugs and request features through [GitHub Issues](https://github.com/your-repo/issues).

## 🔄 Updates

### Version History
- **v1.0.0**: Initial release with core functionality
- **v1.1.0**: Added multi-network support
- **v1.2.0**: Enhanced smart contract integration
- **v1.3.0**: Improved UI/UX and performance

### Roadmap
- [ ] Advanced analytics dashboard
- [ ] Mobile app development
- [ ] DeFi integration
- [ ] NFT marketplace
- [ ] International expansion

---

**Built with ❤️ for the decentralized future of real estate investment.**
