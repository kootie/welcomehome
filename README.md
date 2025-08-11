# Welcome Home Property - Blockchain Real Estate Tokenization Platform

A comprehensive blockchain-based real estate tokenization and investment platform built for fractional property ownership on the **Alkebuleum blockchain** with Ethereum Sepolia testnet support.

## 🏗️ **System Architecture**

### Smart Contracts (Blockchain Layer)
- **AlkebuleumPropertyToken**: Primary property token with Alkebuleum-specific features
- **PropertyFactory**: Gas-efficient property token deployment using Clones pattern
- **Marketplace**: Secondary trading of property tokens
- **OwnershipRegistry**: Property ownership tracking and analytics
- **PropertyGovernance**: Full governance system with voting and proposals
- **TimelockController**: Security layer for governance actions

### Backend API (Data Layer)
- **Node.js/Express Server**: RESTful API with comprehensive endpoints
- **SQLite Database**: Lightweight, file-based database for development and production
- **JWT Authentication**: Secure wallet-based authentication system
- **KYC Management**: Document verification and user compliance
- **Property Management**: CRUD operations for real estate properties
- **Marketplace Operations**: Token listing, trading, and transaction tracking
- **Governance API**: Proposal creation, voting, and execution tracking
- **Blockchain Integration**: Transaction monitoring and signature verification

### Frontend (User Interface)
- **React/Next.js**: Modern web application with responsive design
- **Web3 Integration**: MetaMask and wallet connectivity
- **Property Dashboard**: Property discovery and management
- **Trading Interface**: Marketplace for token trading
- **Governance Portal**: Proposal viewing and voting interface
- **User Profile**: KYC submission and account management

## 📊 **Database Schema**

The SQLite backend provides a comprehensive data layer with the following core tables:

- **Users**: Profile management and wallet addresses
- **KYC Records**: Document verification and compliance
- **Properties**: Real estate information and metadata
- **Property Tokens**: Tokenized property representations
- **User Holdings**: Token balance tracking
- **Marketplace Listings**: Trading and liquidity
- **Transactions**: Blockchain transaction records
- **Governance**: Proposals, votes, and execution
- **Property History**: Change tracking and audit trails
- **Valuations**: Property value assessment history

For detailed database schema and API documentation, see **[backend/README.md](backend/README.md)**.

## 📚 **Documentation**

- **[User Flow Documentation](USER_FLOW_DOCUMENTATION.md)** - Complete user journey and system flows
- **[Security Token List](SECURITY_TOKEN_LIST.md)** - Security mechanisms and access control
- **[Database Schema](DATABASE_SCHEMA.md)** - Complete database structure and relationships
- **[Database Tables Reference](DATABASE_TABLES_REFERENCE.md)** - Quick reference for all tables and fields
- **[Backend API Documentation](backend/README.md)** - Backend API endpoints and usage

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Hardhat development environment
- MetaMask or compatible Web3 wallet
- Alkebuleum network configuration

### Installation
```bash
git clone <repository-url>
cd welcomehome
npm install
```

### Environment Setup
```bash
cp env.example .env
# Edit .env with your Alkebuleum configuration
```

### Local Development
```bash
# Start local blockchain
npm run node

# Deploy contracts locally
npm run deploy:local

# Run tests
npm run test

# Compile contracts
npm run compile
```

### Network Deployment

#### Sepolia Testnet (Development/Testing)
```bash
npm run deploy:sepolia
```

#### Alkebuleum Mainnet (Production)
```bash
npm run deploy:alkebuleum
```

#### Alkebuleum Testnet (if available)
```bash
npm run deploy:alkebuleum-testnet
```

### 📋 **Complete Deployment Guide**
For detailed deployment instructions, testing procedures, and production deployment steps, see **[DEPLOYMENT_INSTRUCTIONS.md](DEPLOYMENT_INSTRUCTIONS.md)**.

**Quick Workflow:**
1. **Local Development** → `npm run deploy:local`
2. **Sepolia Testing** → `npm run deploy:sepolia` 
3. **Alkebuleum Production** → `npm run deploy:alkebuleum`

## 📋 Core Contracts

### 1. **AlkebuleumPropertyToken** (New - Alkebuleum-Optimized)
- **ERC20 + ERC20Votes + ERC20Permit**: Full governance and gasless approval support
- **Alkebuleum-Specific Fields**: Property types, statuses, area, coordinates, valuation sources
- **Property Connection**: Links to external property contracts with transaction IDs
- **Max Tokens Cap**: Enforces immutable supply limits
- **KYC Integration**: Requires verification for transfers and purchases
- **Role-Based Access**: MINTER_ROLE, PAUSER_ROLE, PROPERTY_MANAGER_ROLE, ALKEBULEUM_ADMIN_ROLE, VALUATOR_ROLE
- **Property History**: Complete audit trail of all property changes

```solidity
// Alkebuleum-specific property types
enum PropertyType {
    RESIDENTIAL, COMMERCIAL, INDUSTRIAL, LAND, MIXED_USE, AGRICULTURAL
}

// Property status tracking
enum PropertyStatus {
    ACTIVE, MAINTENANCE, SOLD, FORECLOSED, RENTED, VACANT, UNDER_CONSTRUCTION
}

// Valuation sources
enum ValuationSource {
    APPRAISAL, MARKET_ANALYSIS, AUTOMATED_VALUATION_MODEL, COMPARABLE_SALES, INCOME_APPROACH
}
```

### 2. **PropertyToken** (Enhanced)
- **ERC20 + ERC20Votes + ERC20Permit**: Full governance and gasless approval support
- **Property Connection**: Links to external property contracts with transaction IDs
- **Max Tokens Cap**: Enforces immutable supply limits
- **KYC Integration**: Requires verification for transfers and purchases
- **Role-Based Access**: MINTER_ROLE, PAUSER_ROLE, PROPERTY_MANAGER_ROLE, ALKEBULEUM_ADMIN_ROLE

### 3. **PropertyFactory**
- **Clones Pattern**: Gas-efficient deployment of new property tokens
- **Property Registry**: Comprehensive tracking of all created properties
- **Role Management**: PROPERTY_CREATOR_ROLE for property creation
- **Metadata Management**: IPFS URI and comprehensive property details
- **Alkebuleum Integration**: Supports all property types and metadata fields

### 4. **Marketplace**
- **Secondary Trading**: Buy/sell property tokens
- **Platform Fees**: Configurable fee collection (default: 2.5%)
- **KYC Verification**: Ensures only verified users can trade
- **Listing Management**: Create, update, and remove token listings

### 5. **OwnershipRegistry**
- **Ownership Tracking**: Maps users to token holdings
- **Transfer History**: Complete audit trail of all transactions
- **Analytics Support**: Queryable data for frontend/backend APIs

### 6. **PropertyGovernance** (New)
- **Governance Proposals**: Token holders can propose property-related decisions
- **Voting System**: ERC20Votes-based voting with configurable thresholds
- **Timelock Control**: Delayed execution for security
- **Proposal Management**: Create, vote, queue, and execute proposals

### 7. **TimelockController** (New)
- **Delayed Execution**: Configurable delays for governance actions
- **Security Layer**: Prevents immediate execution of proposals
- **Access Control**: Only governance contract can propose/execute

## 🔐 Security Features

### Access Control
- **Role-Based Permissions**: Granular access control across all contracts
- **KYC Verification**: Required for all token operations
- **Pausable Functions**: Emergency pause capabilities
- **Reentrancy Protection**: Guards against reentrancy attacks

### Governance Security
- **Proposal Thresholds**: Minimum token requirements for proposals
- **Voting Periods**: Configurable voting windows
- **Quorum Requirements**: Minimum participation thresholds
- **Timelock Delays**: Prevents immediate execution of proposals

### Emergency Functions
- **Token Recovery**: Recover ERC20 tokens sent by mistake
- **Pause/Unpause**: Emergency stop functionality
- **Role Management**: Admin can grant/revoke roles

## 💰 Token Economics

### Property Token Features
- **Fractional Ownership**: ERC20 tokens represent property shares
- **Voting Power**: ERC20Votes for governance participation
- **Gasless Approvals**: ERC20Permit for efficient token management
- **Supply Caps**: Immutable maximum token supply per property

### Marketplace Features
- **Platform Fees**: 2.5% fee on all trades (configurable)
- **Dynamic Pricing**: Market-driven token pricing
- **Liquidity**: Secondary market for token trading

### Alkebuleum-Specific Features
- **Property Types**: Residential, commercial, industrial, land, mixed-use, agricultural
- **Property Statuses**: Active, maintenance, sold, foreclosed, rented, vacant, under construction
- **Valuation Sources**: Appraisal, market analysis, automated models, comparable sales, income approach
- **Property History**: Complete audit trail of all property changes

## 🗳️ Governance System

### Proposal Creation
- **Threshold Requirements**: Minimum token holdings to propose
- **Multi-Action Support**: Complex proposals with multiple targets
- **Description Storage**: On-chain proposal descriptions

### Voting Process
- **Voting Power**: Based on token balance at proposal time
- **Voting Options**: For, Against, Abstain
- **Voting Period**: Configurable duration (default: 1 day)

### Execution
- **Timelock Delay**: 24-hour delay before execution
- **Multi-Sig Support**: Governance contract controls execution
- **Proposal Tracking**: Complete history of all proposals

## 🔧 Development

### Testing
```bash
# Run all tests
npm run test

# Run tests with gas reporting
npm run test:gas

# Run specific test file
npx hardhat test test/WelcomeHomeProperty.test.js

# Run with gas reporting
REPORT_GAS=true npm run test
```

### Contract Analysis
```bash
# Check contract sizes
npm run size

# Generate coverage report
npm run coverage

# Lint contracts
npm run lint

# Fix linting issues
npm run lint:fix
```

### Contract Verification
```bash
# Verify on Etherscan (Sepolia)
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>

# Verify on Alkebuleum Explorer
npx hardhat verify --network alkebuleum <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

### Local Deployment
```bash
# Start local node
npm run node

# Deploy contracts
npm run deploy:local

# Verify deployment
node scripts/verify-deployment.js
```

### 📚 **Detailed Development Guide**
For comprehensive development workflows, testing strategies, and deployment procedures, see **[DEPLOYMENT_INSTRUCTIONS.md](DEPLOYMENT_INSTRUCTIONS.md)**.

## 📊 Contract Addresses

After deployment, contract addresses are saved to:
- `deployments/localhost.json` (local development)
- `deployments/sepolia.json` (Sepolia testnet)
- `deployments/alkebuleum.json` (Alkebuleum mainnet)
- `deployments/alkebuleumTestnet.json` (Alkebuleum testnet)

## 🌐 Network Configuration

### Sepolia Testnet
- **RPC URL**: `https://sepolia.infura.io/v3/YOUR_PROJECT_ID`
- **Chain ID**: 11155111
- **Block Explorer**: https://sepolia.etherscan.io

### Alkebuleum Mainnet
- **RPC URL**: `https://rpc.alkebuleum.org`
- **Chain ID**: 1337 (update with actual chain ID)
- **Block Explorer**: https://explorer.alkebuleum.org
- **Gas Price**: 1 gwei (configurable)

### Alkebuleum Testnet
- **RPC URL**: `https://testnet-rpc.alkebuleum.org`
- **Chain ID**: 1338 (update with actual testnet chain ID)
- **Block Explorer**: https://testnet-explorer.alkebuleum.org

### Local Development
- **RPC URL**: `http://127.0.0.1:8545`
- **Chain ID**: 31337
- **Accounts**: 20 pre-funded accounts

## 🔄 Upgradeability

### Proxy Pattern
- **Implementation Contracts**: Upgradeable logic contracts
- **Proxy Contracts**: Fixed address, upgradeable implementation
- **Storage Layout**: Preserved across upgrades

### Governance Upgrades
- **Timelock Protection**: Delayed execution of upgrades
- **Multi-Sig Requirements**: Governance approval for upgrades
- **Backward Compatibility**: Maintains existing functionality

## 📈 Monitoring & Analytics

### Event Tracking
- **Property Creation**: Complete property lifecycle events
- **Token Transfers**: All ownership changes
- **Governance Actions**: Proposal creation, voting, execution
- **Market Activity**: Listing, trading, fee collection
- **Alkebuleum Events**: Property type/status changes, valuation updates

### Data Queries
- **User Holdings**: Current token balances
- **Transfer History**: Complete transaction audit trail
- **Governance History**: All proposals and outcomes
- **Market Statistics**: Trading volume and activity
- **Property Analytics**: Type distribution, status tracking, valuation trends

## 🚨 Emergency Procedures

### Pause Functionality
```solidity
// Pause all operations
await contract.pause()

// Resume operations
await contract.unpause()
```

### Token Recovery
```solidity
// Recover ERC20 tokens sent by mistake
await contract.recoverERC20(tokenAddress, amount)
```

### Role Management
```solidity
// Grant emergency roles
await contract.grantRole(EMERGENCY_ROLE, address)

// Revoke compromised roles
await contract.revokeRole(COMPROMISED_ROLE, address)
```

## 🔗 Integration

### Frontend Integration
- **Web3 Provider**: MetaMask, WalletConnect, etc.
- **Contract Interaction**: Ethers.js or Web3.js
- **Event Listening**: Real-time updates via contract events
- **Alkebuleum Support**: Network-specific property metadata display

### Backend Integration
- **KYC Verification**: Third-party KYC provider integration
- **IPFS Storage**: Decentralized metadata storage
- **API Endpoints**: RESTful APIs for contract interaction
- **Property Analytics**: Comprehensive property data analysis

## 📚 Additional Resources

### Documentation
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Hardhat Documentation](https://hardhat.org/docs/)
- [Ethereum Development](https://ethereum.org/developers/)
- [Alkebuleum Blockchain](https://alkebuleum.org/)

### Project Documentation
- **[DEPLOYMENT_INSTRUCTIONS.md](DEPLOYMENT_INSTRUCTIONS.md)** - Complete deployment guide
- **[env.example](env.example)** - Environment configuration template
- **[scripts/](scripts/)** - Deployment and utility scripts
- **[test/](test/)** - Comprehensive test suite

### Standards
- [ERC-20](https://eips.ethereum.org/EIPS/eip-20)
- [ERC-20Votes](https://eips.ethereum.org/EIPS/eip-5805)
- [ERC-20Permit](https://eips.ethereum.org/EIPS/eip-2612)
- [EIP-712](https://eips.ethereum.org/EIPS/eip-712)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For technical support or questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation
- Visit [Alkebuleum.org](https://alkebuleum.org/) for blockchain-specific information

---

**Welcome Home Property** - Building the future of real estate investment through blockchain technology on **Alkebuleum**.
