const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    const network = hre.network.name;
    
    console.log("🚀 Deploying RateLimiter contract!");
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
        // Deploy RateLimiter
        console.log("\n⏱️ Deploying RateLimiter...");
        const RateLimiter = await ethers.getContractFactory("RateLimiter");
        
        const rateLimiter = await RateLimiter.deploy(deployer.address);
        await rateLimiter.deployed();
        console.log("✅ RateLimiter deployed to:", rateLimiter.address);

        // Verify initial configuration
        console.log("\n🔍 Verifying deployment...");
        
        // Check roles
        const adminRole = await rateLimiter.DEFAULT_ADMIN_ROLE();
        const operatorRole = await rateLimiter.OPERATOR_ROLE();
        const rateManagerRole = await rateLimiter.RATE_MANAGER_ROLE();
        const executorRole = await rateLimiter.EXECUTOR_ROLE();
        
        console.log("✅ Roles configured:");
        console.log("  - DEFAULT_ADMIN_ROLE:", adminRole);
        console.log("  - OPERATOR_ROLE:", operatorRole);
        console.log("  - RATE_MANAGER_ROLE:", rateManagerRole);
        console.log("  - EXECUTOR_ROLE:", executorRole);

        // Check default rate limits for different networks
        const mainnetConfig = await rateLimiter.getRateLimit(1); // Ethereum Mainnet
        const sepoliaConfig = await rateLimiter.getRateLimit(11155111); // Sepolia
        const alkebuleumConfig = await rateLimiter.getRateLimit(1337); // Alkebuleum
        
        console.log("\n📊 Network Rate Limit Configurations:");
        console.log("Ethereum Mainnet (Chain ID 1):");
        console.log("  - Max TPS:", mainnetConfig.maxTransactionsPerSecond.toString());
        console.log("  - Max TPM:", mainnetConfig.maxTransactionsPerMinute.toString());
        console.log("  - Max TPH:", mainnetConfig.maxTransactionsPerHour.toString());
        console.log("  - Max Gas/Second:", mainnetConfig.maxGasPerSecond.toString());
        console.log("  - Active:", mainnetConfig.isActive);
        
        console.log("Sepolia (Chain ID 11155111):");
        console.log("  - Max TPS:", sepoliaConfig.maxTransactionsPerSecond.toString());
        console.log("  - Max TPM:", sepoliaConfig.maxTransactionsPerMinute.toString());
        console.log("  - Max TPH:", sepoliaConfig.maxTransactionsPerHour.toString());
        console.log("  - Max Gas/Second:", sepoliaConfig.maxGasPerSecond.toString());
        console.log("  - Active:", sepoliaConfig.isActive);
        
        console.log("Alkebuleum (Chain ID 1337):");
        console.log("  - Max TPS:", alkebuleumConfig.maxTransactionsPerSecond.toString());
        console.log("  - Max TPM:", alkebuleumConfig.maxTransactionsPerMinute.toString());
        console.log("  - Max TPH:", alkebuleumConfig.maxTransactionsPerHour.toString());
        console.log("  - Max Gas/Second:", alkebuleumConfig.maxGasPerSecond.toString());
        console.log("  - Active:", alkebuleumConfig.isActive);

        // Check global settings
        const globalMaxTps = await rateLimiter.globalMaxTransactionsPerSecond();
        const globalMaxGasPerSecond = await rateLimiter.globalMaxGasPerSecond();
        const maxQueueSize = await rateLimiter.maxQueueSize();
        const queueTimeout = await rateLimiter.queueTimeout();
        const minPriorityFee = await rateLimiter.minPriorityFee();
        const maxPriorityFee = await rateLimiter.maxPriorityFee();
        
        console.log("\n⚙️ Global Settings:");
        console.log("  - Global Max TPS:", globalMaxTps.toString());
        console.log("  - Global Max Gas/Second:", globalMaxGasPerSecond.toString());
        console.log("  - Max Queue Size:", maxQueueSize.toString());
        console.log("  - Queue Timeout:", queueTimeout.toString(), "seconds");
        console.log("  - Min Priority Fee:", ethers.utils.formatUnits(minPriorityFee, "gwei"), "gwei");
        console.log("  - Max Priority Fee:", ethers.utils.formatUnits(maxPriorityFee, "gwei"), "gwei");

        // Check supported networks
        const mainnetSupported = await rateLimiter.supportedNetworks(1);
        const sepoliaSupported = await rateLimiter.supportedNetworks(11155111);
        const alkebuleumSupported = await rateLimiter.supportedNetworks(1337);
        
        console.log("\n🌐 Supported Networks:");
        console.log("  - Ethereum Mainnet:", mainnetSupported);
        console.log("  - Sepolia:", sepoliaSupported);
        console.log("  - Alkebuleum:", alkebuleumSupported);

        // Save deployment addresses
        const deploymentInfo = {
            network: network,
            deployer: deployer.address,
            chainId: await ethers.provider.getNetwork().then(n => n.chainId),
            contracts: {
                rateLimiter: rateLimiter.address
            },
            configuration: {
                globalMaxTps: globalMaxTps.toString(),
                globalMaxGasPerSecond: globalMaxGasPerSecond.toString(),
                maxQueueSize: maxQueueSize.toString(),
                queueTimeout: queueTimeout.toString(),
                minPriorityFee: ethers.utils.formatUnits(minPriorityFee, "gwei"),
                maxPriorityFee: ethers.utils.formatUnits(maxPriorityFee, "gwei")
            },
            networkConfigs: {
                mainnet: {
                    maxTps: mainnetConfig.maxTransactionsPerSecond.toString(),
                    maxTpm: mainnetConfig.maxTransactionsPerMinute.toString(),
                    maxTph: mainnetConfig.maxTransactionsPerHour.toString(),
                    maxGasPerSecond: mainnetConfig.maxGasPerSecond.toString(),
                    isActive: mainnetConfig.isActive
                },
                sepolia: {
                    maxTps: sepoliaConfig.maxTransactionsPerSecond.toString(),
                    maxTpm: sepoliaConfig.maxTransactionsPerMinute.toString(),
                    maxTph: sepoliaConfig.maxTransactionsPerHour.toString(),
                    maxGasPerSecond: sepoliaConfig.maxGasPerSecond.toString(),
                    isActive: sepoliaConfig.isActive
                },
                alkebuleum: {
                    maxTps: alkebuleumConfig.maxTransactionsPerSecond.toString(),
                    maxTpm: alkebuleumConfig.maxTransactionsPerMinute.toString(),
                    maxTph: alkebuleumConfig.maxTransactionsPerHour.toString(),
                    maxGasPerSecond: alkebuleumConfig.maxGasPerSecond.toString(),
                    isActive: alkebuleumConfig.isActive
                }
            },
            supportedNetworks: {
                mainnet: mainnetSupported,
                sepolia: sepoliaSupported,
                alkebuleum: alkebuleumSupported
            },
            deploymentTime: new Date().toISOString()
        };

        console.log("\n📋 Deployment Summary:");
        console.log(JSON.stringify(deploymentInfo, null, 2));

        // Save to file for verification
        const fs = require('fs');
        const deploymentPath = `deployments/rate-limiter-${network}.json`;
        
        // Ensure deployments directory exists
        if (!fs.existsSync('deployments')) {
            fs.mkdirSync('deployments');
        }
        
        fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
        console.log(`\n💾 Deployment info saved to: ${deploymentPath}`);

        // Test basic functionality (optional)
        console.log("\n🧪 Testing basic functionality...");
        try {
            // Test queue transaction
            const mockTarget = deployer.address; // Use deployer as mock target
            const gasLimit = 100000;
            const priority = 1; // NORMAL priority
            const priorityFee = ethers.utils.parseUnits("2", "gwei");
            
            const tx = await rateLimiter.queueTransaction(
                mockTarget,
                gasLimit,
                priority,
                priorityFee
            );
            await tx.wait();
            console.log("✅ Transaction queuing test successful");
            
            // Check queue stats
            const queueStats = await rateLimiter.getQueueStats();
            console.log("✅ Queue stats:", {
                totalQueued: queueStats.totalQueued.toString(),
                normalPriority: queueStats.normalPriority.toString()
            });
            
        } catch (error) {
            console.log("⚠️ Basic functionality test failed (this is normal for testing):", error.message);
        }

        console.log("\n🎉 RateLimiter deployed successfully!");
        console.log("\n📚 Next steps:");
        console.log("1. Verify contract on network explorer");
        console.log("2. Configure rate limits for your specific use case");
        console.log("3. Set up priority queues and execution strategies");
        console.log("4. Integrate with GasFeeManager for complete transaction management");
        console.log("\n🔗 Contract Address:");
        console.log("RateLimiter:", rateLimiter.address);
        console.log("\n🔧 Key Functions:");
        console.log("- queueTransaction(...): Queue a transaction with priority");
        console.log("- executeNextTransaction(): Execute next transaction from queue");
        console.log("- executeTransaction(id): Execute specific transaction");
        console.log("- getQueueStats(): Get queue statistics");
        console.log("- getUserRate(user): Get user rate information");
        console.log("- updateRateLimit(...): Update network rate limits (admin)");
        console.log("- cleanupExpiredTransactions(): Clean up expired transactions");

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
