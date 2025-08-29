const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    const network = hre.network.name;
    
    console.log("🚀 Deploying TransactionOrchestrator contract!");
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
        // Step 1: Deploy GasFeeManager (if not already deployed)
        console.log("\n💰 Step 1: Deploying GasFeeManager...");
        const GasFeeManager = await ethers.getContractFactory("GasFeeManager");
        
        const gasFeeManager = await GasFeeManager.deploy(
            deployer.address, // feeCollector
            deployer.address, // gasProvider
            deployer.address  // admin
        );
        await gasFeeManager.deployed();
        console.log("✅ GasFeeManager deployed to:", gasFeeManager.address);

        // Step 2: Deploy RateLimiter
        console.log("\n⏱️ Step 2: Deploying RateLimiter...");
        const RateLimiter = await ethers.getContractFactory("RateLimiter");
        
        const rateLimiter = await RateLimiter.deploy(deployer.address);
        await rateLimiter.deployed();
        console.log("✅ RateLimiter deployed to:", rateLimiter.address);

        // Step 3: Deploy TransactionOrchestrator
        console.log("\n🎼 Step 3: Deploying TransactionOrchestrator...");
        const TransactionOrchestrator = await ethers.getContractFactory("TransactionOrchestrator");
        
        const transactionOrchestrator = await TransactionOrchestrator.deploy(
            gasFeeManager.address,    // gasFeeManager
            rateLimiter.address,      // rateLimiter
            deployer.address,         // orchestratorFeeCollector
            deployer.address          // admin
        );
        await transactionOrchestrator.deployed();
        console.log("✅ TransactionOrchestrator deployed to:", transactionOrchestrator.address);

        // Verify initial configuration
        console.log("\n🔍 Verifying deployment...");
        
        // Check contract references
        const actualGasFeeManager = await transactionOrchestrator.gasFeeManager();
        const actualRateLimiter = await transactionOrchestrator.rateLimiter();
        const orchestratorFeeCollector = await transactionOrchestrator.orchestratorFeeCollector();
        
        console.log("✅ Contract References:");
        console.log("  - GasFeeManager:", actualGasFeeManager);
        console.log("  - RateLimiter:", actualRateLimiter);
        console.log("  - Orchestrator Fee Collector:", orchestratorFeeCollector);

        // Check configuration
        const maxBatchSize = await transactionOrchestrator.maxBatchSize();
        const executionTimeout = await transactionOrchestrator.executionTimeout();
        const minExecutionInterval = await transactionOrchestrator.minExecutionInterval();
        const orchestratorFeePercentage = await transactionOrchestrator.orchestratorFeePercentage();
        
        console.log("\n⚙️ Configuration:");
        console.log("  - Max Batch Size:", maxBatchSize.toString());
        console.log("  - Execution Timeout:", executionTimeout.toString(), "seconds");
        console.log("  - Min Execution Interval:", minExecutionInterval.toString(), "seconds");
        console.log("  - Orchestrator Fee Percentage:", orchestratorFeePercentage.toString(), "basis points (0.25%)");

        // Check performance metrics
        const performanceMetrics = await transactionOrchestrator.getPerformanceMetrics();
        console.log("\n📊 Performance Metrics:");
        console.log("  - Total Transactions Processed:", performanceMetrics.totalProcessed.toString());
        console.log("  - Total Gas Used:", performanceMetrics.totalGas.toString());
        console.log("  - Average Execution Time:", performanceMetrics.avgExecutionTime.toString(), "seconds");
        console.log("  - Success Rate:", performanceMetrics.successRateBps.toString(), "basis points");

        // Check queue stats
        const queueStats = await transactionOrchestrator.getQueueStats();
        console.log("\n📋 Queue Statistics:");
        console.log("  - Total Queued:", queueStats.totalQueued.toString());
        console.log("  - Low Priority:", queueStats.lowPriority.toString());
        console.log("  - Normal Priority:", queueStats.normalPriority.toString());
        console.log("  - High Priority:", queueStats.highPriority.toString());
        console.log("  - Urgent Priority:", queueStats.urgentPriority.toString());
        console.log("  - Critical Priority:", queueStats.criticalPriority.toString());

        // Save deployment addresses
        const deploymentInfo = {
            network: network,
            deployer: deployer.address,
            chainId: await ethers.provider.getNetwork().then(n => n.chainId),
            contracts: {
                gasFeeManager: gasFeeManager.address,
                rateLimiter: rateLimiter.address,
                transactionOrchestrator: transactionOrchestrator.address
            },
            configuration: {
                maxBatchSize: maxBatchSize.toString(),
                executionTimeout: executionTimeout.toString(),
                minExecutionInterval: minExecutionInterval.toString(),
                orchestratorFeePercentage: orchestratorFeePercentage.toString(),
                orchestratorFeeCollector: orchestratorFeeCollector
            },
            performanceMetrics: {
                totalProcessed: performanceMetrics.totalProcessed.toString(),
                totalGas: performanceMetrics.totalGas.toString(),
                avgExecutionTime: performanceMetrics.avgExecutionTime.toString(),
                successRate: performanceMetrics.successRateBps.toString()
            },
            queueStats: {
                totalQueued: queueStats.totalQueued.toString(),
                lowPriority: queueStats.lowPriority.toString(),
                normalPriority: queueStats.normalPriority.toString(),
                highPriority: queueStats.highPriority.toString(),
                urgentPriority: queueStats.urgentPriority.toString(),
                criticalPriority: queueStats.criticalPriority.toString()
            },
            deploymentTime: new Date().toISOString()
        };

        console.log("\n📋 Deployment Summary:");
        console.log(JSON.stringify(deploymentInfo, null, 2));

        // Save to file for verification
        const fs = require('fs');
        const deploymentPath = `deployments/transaction-orchestrator-${network}.json`;
        
        // Ensure deployments directory exists
        if (!fs.existsSync('deployments')) {
            fs.mkdirSync('deployments');
        }
        
        fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
        console.log(`\n💾 Deployment info saved to: ${deploymentPath}`);

        // Test basic functionality (optional)
        console.log("\n🧪 Testing basic functionality...");
        try {
            // Test orchestrate transaction
            const mockTarget = deployer.address; // Use deployer as mock target
            const value = 0;
            const data = "0x";
            const gasLimit = 100000;
            const maxFeePerGas = ethers.utils.parseUnits("20", "gwei");
            const maxPriorityFeePerGas = ethers.utils.parseUnits("2", "gwei");
            const tokenAddress = ethers.constants.AddressZero; // Native token
            const tokenAmount = ethers.utils.parseEther("0.01");
            const priority = 1; // NORMAL priority

            // First, deposit some tokens to GasFeeManager
            await gasFeeManager.depositNative({ value: ethers.utils.parseEther("0.1") });
            console.log("✅ Deposited tokens to GasFeeManager");

            // Orchestrate a transaction
            const tx = await transactionOrchestrator.orchestrateTransaction(
                mockTarget,
                value,
                data,
                gasLimit,
                maxFeePerGas,
                maxPriorityFeePerGas,
                tokenAddress,
                tokenAmount,
                priority
            );
            await tx.wait();
            console.log("✅ Transaction orchestration test successful");
            
            // Check if transaction can be orchestrated
            const canOrchestrate = await transactionOrchestrator.canOrchestrateTransaction(
                deployer.address,
                gasLimit,
                tokenAmount,
                tokenAddress
            );
            console.log("✅ Can orchestrate transaction:", canOrchestrate);
            
        } catch (error) {
            console.log("⚠️ Basic functionality test failed (this is normal for testing):", error.message);
        }

        console.log("\n🎉 TransactionOrchestrator deployed successfully!");
        console.log("\n📚 Next steps:");
        console.log("1. Verify all contracts on network explorer");
        console.log("2. Configure rate limits and gas fee settings");
        console.log("3. Set up priority queues and execution strategies");
        console.log("4. Test transaction orchestration and execution");
        console.log("5. Monitor performance metrics and optimize settings");
        console.log("\n🔗 Contract Addresses:");
        console.log("GasFeeManager:", gasFeeManager.address);
        console.log("RateLimiter:", rateLimiter.address);
        console.log("TransactionOrchestrator:", transactionOrchestrator.address);
        console.log("\n🔧 Key Functions:");
        console.log("- orchestrateTransaction(...): Orchestrate a transaction with gas fees and rate limiting");
        console.log("- executeTransaction(id): Execute a single transaction");
        console.log("- executeBatch(ids): Execute multiple transactions in batch");
        console.log("- executeNextTransaction(): Execute next transaction from priority queue");
        console.log("- getQueueStats(): Get queue statistics");
        console.log("- getPerformanceMetrics(): Get performance metrics");
        console.log("- canOrchestrateTransaction(...): Check if transaction can be orchestrated");
        console.log("- updateConfiguration(...): Update configuration (admin)");

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
