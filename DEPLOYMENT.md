# 🏠 Welcome Home Property - Deployment Guide

This guide will help you deploy the Welcome Home Property platform to Sepolia testnet and prepare for mainnet deployment.

## 📋 Prerequisites

### 1. Environment Setup
- Node.js v18+ and npm
- Git
- MetaMask or similar wallet
- Sepolia testnet ETH (get from [Sepolia Faucet](https://sepoliafaucet.com/))

### 2. Required API Keys
- **Infura/Alchemy**: For Sepolia RPC access
- **Etherscan**: For contract verification

## 🔧 Environment Configuration

### Step 1: Create Environment File
Copy the example environment file and configure it:

```bash
cp env.example .env
```

### Step 2: Configure Environment Variables
Edit `.env` with your actual values:

```env
# Network Configuration
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR-PROJECT-ID
SEPOLIA_CHAIN_ID=11155111

# API Keys
ETHERSCAN_API_KEY=your-etherscan-api-key

# Deployment Configuration
PRIVATE_KEY=your-private-key-here
DEPLOYER_ADDRESS=your-deployer-address-here

# Gas Reporting
REPORT_GAS=true
GAS_PRICE=1

# Contract Verification
VERIFY_CONTRACTS=true
```

### Step 3: Get Required Credentials

#### Sepolia ETH
1. Visit [Sepolia Faucet](https://sepoliafaucet.com/)
2. Connect your wallet
3. Request test ETH (recommend 0.5-1 ETH for deployment)

#### Infura/Alchemy RPC URL
1. Sign up at [Infura](https://infura.io/) or [Alchemy](https://alchemy.com/)
2. Create a new project
3. Copy the Sepolia RPC URL

#### Etherscan API Key
1. Sign up at [Etherscan](https://etherscan.io/)
2. Go to API Keys section
3. Create a new API key

## 🚀 Deployment to Sepolia Testnet

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Compile Contracts
```bash
npx hardhat compile
```

### Step 3: Run Tests (Optional but Recommended)
```bash
npx hardhat test
```

### Step 4: Deploy to Sepolia
```bash
npx hardhat run scripts/deploy-sepolia.js --network sepolia
```

### Step 5: Verify Deployment
The deployment script will:
- Deploy all contracts
- Set up roles and permissions
- Save deployment addresses to `deployments/sepolia.json`
- Display contract addresses

## 📊 Contract Addresses

After deployment, you'll see addresses like:
```
KYC Registry: 0x...
Property Token Impl: 0x...
Property Factory: 0x...
Marketplace: 0x...
Ownership Registry: 0x...
Timelock Controller: 0x...
Property Governance: 0x...
```

## 🔍 Contract Verification

### Automatic Verification
The deployment script saves contract addresses. To verify on Etherscan:

1. Visit [Sepolia Etherscan](https://sepolia.etherscan.io/)
2. Search for each contract address
3. Click "Contract" tab
4. Click "Verify and Publish"
5. Use the verification script:
```bash
npx hardhat run scripts/verify-deployment.js --network sepolia
```

## 🧪 Testing Deployed Contracts

### 1. Test KYC Verification
```javascript
// Connect to KYC Registry
const kycRegistry = await ethers.getContractAt("KYCRegistry", "CONTRACT_ADDRESS");
await kycRegistry.verifyUser(userAddress, "user@example.com");
```

### 2. Test Property Creation
```javascript
// Connect to Property Factory
const propertyFactory = await ethers.getContractAt("PropertyFactory", "CONTRACT_ADDRESS");
await propertyFactory.createProperty(
    "Test Property",
    "TEST",
    1000000 * 10**18,
    100 * 10**18,
    "ipfs://metadata",
    "123 Test St",
    500000 * 10**18,
    "TX123"
);
```

### 3. Test Marketplace
```javascript
// Connect to Marketplace
const marketplace = await ethers.getContractAt("Marketplace", "CONTRACT_ADDRESS");
await marketplace.listTokens(tokenAddress, amount, price);
```

## 🔐 Security Considerations

### 1. Private Key Security
- Never commit `.env` files to version control
- Use hardware wallets for mainnet deployment
- Consider using multi-sig wallets for admin functions

### 2. Role Management
- Review all role assignments after deployment
- Consider using timelock for critical functions
- Implement proper access controls

### 3. Contract Verification
- Always verify contracts on Etherscan
- Share verified contract addresses with users
- Document contract interactions

## 📈 Mainnet Deployment

### Preparation Checklist
- [ ] Complete Sepolia testing
- [ ] Security audit completed
- [ ] Gas optimization verified
- [ ] Documentation updated
- [ ] Team training completed
- [ ] Emergency procedures in place

### Mainnet Deployment Steps
1. Update environment variables for mainnet
2. Deploy using mainnet deployment script
3. Verify contracts on mainnet Etherscan
4. Set up monitoring and alerts
5. Announce deployment to community

## 🛠️ Troubleshooting

### Common Issues

#### 1. Insufficient Gas
```
Error: insufficient funds for gas * price + value
```
**Solution**: Get more Sepolia ETH from faucet

#### 2. Network Issues
```
Error: network error
```
**Solution**: Check RPC URL and network configuration

#### 3. Contract Verification Fails
```
Error: Already Verified
```
**Solution**: Contract already verified, check Etherscan

#### 4. Role Assignment Fails
```
Error: AccessControl: account ... is missing role ...
```
**Solution**: Check deployer address and role assignments

### Getting Help
- Check [Hardhat Documentation](https://hardhat.org/docs)
- Review contract error messages
- Check network status on [Etherscan](https://etherscan.io/)

## 📚 Additional Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Etherscan API Documentation](https://docs.etherscan.io/)
- [Sepolia Faucet](https://sepoliafaucet.com/)

## 🎯 Next Steps

After successful deployment:

1. **Test All Functions**: Verify all contract functions work as expected
2. **User Testing**: Have users test the platform
3. **Documentation**: Update user documentation with deployed addresses
4. **Monitoring**: Set up monitoring for contract events
5. **Mainnet**: Plan mainnet deployment when ready

---

**⚠️ Important**: This is a testnet deployment. For mainnet, ensure all security measures are in place and contracts are thoroughly audited.
