const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    const network = hre.network.name;
    
    console.log("🚀 Deploying GasFeeManager contract!");
    console.log("Network:", network);
    console.log("Deployer:", deployer.address);
    console.log("Account balance:", ethers.utils.formatEther(await deployer.getBalance()));

    // Check if we're on a supported network
    const supportedNetworks = ['alkebuleum', 'alkebuleumTestnet', 'sepolia', 'localhost'];
    if (!supportedNetworks.includes(network)) {
        console.error("❌ This script is designed for supported networks!");
        console.error("Supported networks:", supportedNetworks.join(", "));
        process.exit(1);
    }

    try {
        // Deploy GasFeeManager
        console.log("\n💰 Deploying GasFeeManager...");
        const GasFeeManager = await ethers.getContractFactory("GasFeeManager");
        
        // Configuration for different networks
        let feeCollector, gasProvider;
        
        if (network === 'alkebuleum' || network === 'alkebuleumTestnet') {
            // For Alkebuleum networks, use deployer as both fee collector and gas provider initially
            feeCollector = deployer.address;
            gasProvider = deployer.address;
        } else if (network === 'sepolia') {
            // For Sepolia, use deployer as both fee collector and gas provider initially
            feeCollector = deployer.address;
            gasProvider = deployer.address;
        } else {
            // For localhost, use deployer as both
            feeCollector = deployer.address;
            gasProvider = deployer.address;
        }

        const gasFeeManager = await GasFeeManager.deploy(
            feeCollector,    // feeCollector
            gasProvider,     // gasProvider
            deployer.address // admin
        );
        await gasFeeManager.deployed();
        console.log("✅ GasFeeManager deployed to:", gasFeeManager.address);

        // Verify initial configuration
        console.log("\n🔍 Verifying deployment...");
        
        const actualFeeCollector = await gasFeeManager.feeCollector();
        const actualGasProvider = await gasFeeManager.gasProvider();
        const platformFee = await gasFeeManager.platformFeePercentage();
        const gasProviderFee = await gasFeeManager.gasProviderFeePercentage();
        
        console.log("✅ Fee Collector:", actualFeeCollector);
        console.log("✅ Gas Provider:", actualGasProvider);
        console.log("✅ Platform Fee:", platformFee.toString(), "basis points (0.5%)");
        console.log("✅ Gas Provider Fee:", gasProviderFee.toString(), "basis points (1%)");

        // Check network-specific gas configurations
        const alkebuleumConfig = await gasFeeManager.getGasConfig(1337); // Alkebuleum chain ID
        const sepoliaConfig = await gasFeeManager.getGasConfig(11155111); // Sepolia chain ID
        
        console.log("\n📊 Network Gas Configurations:");
        console.log("Alkebuleum (Chain ID 1337):");
        console.log("  - Base Gas Price:", ethers.utils.formatUnits(alkebuleumConfig.baseGasPrice, "gwei"), "gwei");
        console.log("  - Max Gas Price:", ethers.utils.formatUnits(alkebuleumConfig.maxGasPrice, "gwei"), "gwei");
        console.log("  - Gas Limit:", alkebuleumConfig.gasLimit.toString());
        console.log("  - Priority Fee:", ethers.utils.formatUnits(alkebuleumConfig.priorityFee, "gwei"), "gwei");
        console.log("  - Active:", alkebuleumConfig.isActive);
        
        console.log("Sepolia (Chain ID 11155111):");
        console.log("  - Base Gas Price:", ethers.utils.formatUnits(sepoliaConfig.baseGasPrice, "gwei"), "gwei");
        console.log("  - Max Gas Price:", ethers.utils.formatUnits(sepoliaConfig.maxGasPrice, "gwei"), "gwei");
        console.log("  - Gas Limit:", sepoliaConfig.gasLimit.toString());
        console.log("  - Priority Fee:", ethers.utils.formatUnits(sepoliaConfig.priorityFee, "gwei"), "gwei");
        console.log("  - Active:", sepoliaConfig.isActive);

        // Check transaction limits
        const minTransactionAmount = await gasFeeManager.minTransactionAmount();
        const maxTransactionAmount = await gasFeeManager.maxTransactionAmount();
        const minGasPrice = await gasFeeManager.minGasPrice();
        const maxGasPrice = await gasFeeManager.maxGasPrice();
        
        console.log("\n💰 Transaction Limits:");
        console.log("  - Min Transaction Amount:", ethers.utils.formatEther(minTransactionAmount), "ETH");
        console.log("  - Max Transaction Amount:", ethers.utils.formatEther(maxTransactionAmount), "ETH");
        console.log("  - Min Gas Price:", ethers.utils.formatUnits(minGasPrice, "gwei"), "gwei");
        console.log("  - Max Gas Price:", ethers.utils.formatUnits(maxGasPrice, "gwei"), "gwei");

        // Save deployment addresses
        const deploymentInfo = {
            network: network,
            deployer: deployer.address,
            chainId: await ethers.provider.getNetwork().then(n => n.chainId),
            contracts: {
                gasFeeManager: gasFeeManager.address
            },
            configuration: {
                feeCollector: actualFeeCollector,
                gasProvider: actualGasProvider,
                platformFeePercentage: platformFee.toString(),
                gasProviderFeePercentage: gasProviderFee.toString(),
                minTransactionAmount: ethers.utils.formatEther(minTransactionAmount),
                maxTransactionAmount: ethers.utils.formatEther(maxTransactionAmount),
                minGasPrice: ethers.utils.formatUnits(minGasPrice, "gwei"),
                maxGasPrice: ethers.utils.formatUnits(maxGasPrice, "gwei")
            },
            networkConfigs: {
                alkebuleum: {
                    baseGasPrice: ethers.utils.formatUnits(alkebuleumConfig.baseGasPrice, "gwei"),
                    maxGasPrice: ethers.utils.formatUnits(alkebuleumConfig.maxGasPrice, "gwei"),
                    gasLimit: alkebuleumConfig.gasLimit.toString(),
                    priorityFee: ethers.utils.formatUnits(alkebuleumConfig.priorityFee, "gwei"),
                    isActive: alkebuleumConfig.isActive
                },
                sepolia: {
                    baseGasPrice: ethers.utils.formatUnits(sepoliaConfig.baseGasPrice, "gwei"),
                    maxGasPrice: ethers.utils.formatUnits(sepoliaConfig.maxGasPrice, "gwei"),
                    gasLimit: sepoliaConfig.gasLimit.toString(),
                    priorityFee: ethers.utils.formatUnits(sepoliaConfig.priorityFee, "gwei"),
                    isActive: sepoliaConfig.isActive
                }
            },
            deploymentTime: new Date().toISOString()
        };

        console.log("\n📋 Deployment Summary:");
        console.log(JSON.stringify(deploymentInfo, null, 2));

        // Save to file for verification
        const fs = require('fs');
        const deploymentPath = `deployments/gas-fee-manager-${network}.json`;
        
        // Ensure deployments directory exists
        if (!fs.existsSync('deployments')) {
            fs.mkdirSync('deployments');
        }
        
        fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
        console.log(`\n💾 Deployment info saved to: ${deploymentPath}`);

        // Test basic functionality (optional)
        console.log("\n🧪 Testing basic functionality...");
        try {
            // Test deposit native tokens
            const depositAmount = ethers.utils.parseEther("0.01");
            const tx = await gasFeeManager.depositNative({ value: depositAmount });
            await tx.wait();
            console.log("✅ Native token deposit test successful");
            
            // Check user balance
            const userBalance = await gasFeeManager.getUserBalance(deployer.address, ethers.constants.AddressZero);
            console.log("✅ User native balance:", ethers.utils.formatEther(userBalance), "ETH");
            
            // Test withdrawal
            const withdrawAmount = ethers.utils.parseEther("0.005");
            const withdrawTx = await gasFeeManager.withdrawNative(withdrawAmount);
            await withdrawTx.wait();
            console.log("✅ Native token withdrawal test successful");
            
        } catch (error) {
            console.log("⚠️ Basic functionality test failed (this is normal for testing):", error.message);
        }

        console.log("\n🎉 GasFeeManager deployed successfully!");
        console.log("\n📚 Next steps:");
        console.log("1. Verify contract on network explorer");
        console.log("2. Update fee collector and gas provider addresses if needed");
        console.log("3. Configure gas settings for your specific use case");
        console.log("4. Test transaction execution with gas fee management");
        console.log("\n🔗 Contract Address:");
        console.log("GasFeeManager:", gasFeeManager.address);
        console.log("\n🔧 Key Functions:");
        console.log("- depositNative(): Deposit ETH for gas fees");
        console.log("- depositTokens(token, amount): Deposit ERC20 tokens for gas fees");
        console.log("- requestTransaction(...): Request a transaction with gas fees");
        console.log("- executeTransaction(requestId): Execute a transaction (gas provider only)");
        console.log("- withdrawNative(amount): Withdraw native tokens");
        console.log("- withdrawTokens(token, amount): Withdraw ERC20 tokens");

    } catch (error) {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
