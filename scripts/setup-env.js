const fs = require('fs');
const path = require('path');

console.log('🔧 Welcome Home Property - Environment Setup');
console.log('============================================\n');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', 'env.example');

if (fs.existsSync(envPath)) {
    console.log('✅ .env file already exists');
    console.log('📝 Please edit it with your actual values:\n');
} else {
    if (fs.existsSync(envExamplePath)) {
        // Copy env.example to .env
        const envExample = fs.readFileSync(envExamplePath, 'utf8');
        fs.writeFileSync(envPath, envExample);
        console.log('✅ Created .env file from env.example');
        console.log('📝 Please edit .env with your actual values:\n');
    } else {
        console.log('❌ env.example not found');
        console.log('📝 Please create .env file manually\n');
    }
}

console.log('🔑 Required Environment Variables:');
console.log('==================================');
console.log('');
console.log('1. SEPOLIA_RPC_URL');
console.log('   - Get from: https://infura.io/ or https://alchemy.com/');
console.log('   - Format: https://sepolia.infura.io/v3/YOUR-PROJECT-ID');
console.log('');
console.log('2. ETHERSCAN_API_KEY');
console.log('   - Get from: https://etherscan.io/');
console.log('   - Go to API Keys section and create new key');
console.log('');
console.log('3. PRIVATE_KEY');
console.log('   - Your wallet private key (without 0x prefix)');
console.log('   - ⚠️  Keep this secure and never share it');
console.log('');
console.log('4. DEPLOYER_ADDRESS');
console.log('   - Your wallet address (0x... format)');
console.log('   - Must have Sepolia ETH for deployment');
console.log('');
console.log('💰 Getting Sepolia ETH:');
console.log('=======================');
console.log('- Visit: https://sepoliafaucet.com/');
console.log('- Connect your wallet');
console.log('- Request test ETH (recommend 0.5-1 ETH)');
console.log('');
console.log('🚀 Next Steps:');
console.log('==============');
console.log('1. Edit .env file with your values');
console.log('2. Run: npx hardhat compile');
console.log('3. Run: npx hardhat test');
console.log('4. Run: npx hardhat run scripts/deploy-sepolia.js --network sepolia');
console.log('');
console.log('📚 For more help, see: DEPLOYMENT.md');
console.log('');
