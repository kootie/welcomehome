const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)));

    // Deploy KYC Registry
    console.log("\n🚀 Deploying KYC Registry...");
    const KYCRegistry = await hre.ethers.getContractFactory("KYCRegistry");
    const kycRegistry = await KYCRegistry.deploy();
    await kycRegistry.waitForDeployment();
    const kycRegistryAddress = await kycRegistry.getAddress();
    console.log("✅ KYCRegistry deployed to:", kycRegistryAddress);

    // Deploy PropertyToken implementation
    console.log("\n🚀 Deploying PropertyToken implementation...");
    const PropertyToken = await hre.ethers.getContractFactory("PropertyToken");
    const propertyTokenImpl = await PropertyToken.deploy(
        "WelcomeHomeProperty", // name
        "WHP", // symbol
        1, // propertyId
        deployer.address, // propertyOwner
        "https://api.welcomehome.com/metadata/1", // metadataURI
        deployer.address // admin
    );
    await propertyTokenImpl.waitForDeployment();
    const propertyTokenImplAddress = await propertyTokenImpl.getAddress();
    console.log("✅ PropertyToken implementation deployed to:", propertyTokenImplAddress);

    // Deploy PropertyFactory
    console.log("\n🚀 Deploying PropertyFactory...");
    const PropertyFactory = await hre.ethers.getContractFactory("PropertyFactory");
    const propertyFactory = await PropertyFactory.deploy(
        propertyTokenImplAddress, // implementation
        kycRegistryAddress, // kycRegistry
        deployer.address // admin
    );
    await propertyFactory.waitForDeployment();
    const propertyFactoryAddress = await propertyFactory.getAddress();
    console.log("✅ PropertyFactory deployed to:", propertyFactoryAddress);

    // Deploy Marketplace
    console.log("\n🚀 Deploying Marketplace...");
    const Marketplace = await hre.ethers.getContractFactory("Marketplace");
    const marketplace = await Marketplace.deploy(
        kycRegistryAddress, // kycRegistry
        deployer.address // feeCollector
    );
    await marketplace.waitForDeployment();
    const marketplaceAddress = await marketplace.getAddress();
    console.log("✅ Marketplace deployed to:", marketplaceAddress);

    // Deploy OwnershipRegistry
    console.log("\n🚀 Deploying OwnershipRegistry...");
    const OwnershipRegistry = await hre.ethers.getContractFactory("OwnershipRegistry");
    const ownershipRegistry = await OwnershipRegistry.deploy(
        kycRegistryAddress // kycRegistry
    );
    await ownershipRegistry.waitForDeployment();
    const ownershipRegistryAddress = await ownershipRegistry.getAddress();
    console.log("✅ OwnershipRegistry deployed to:", ownershipRegistryAddress);

    // Deploy GasFeeManager
    console.log("\n🚀 Deploying GasFeeManager...");
    const GasFeeManager = await hre.ethers.getContractFactory("GasFeeManager");
    const gasFeeManager = await GasFeeManager.deploy(
        deployer.address, // feeCollector
        deployer.address, // gasProvider
        deployer.address // admin
    );
    await gasFeeManager.waitForDeployment();
    const gasFeeManagerAddress = await gasFeeManager.getAddress();
    console.log("✅ GasFeeManager deployed to:", gasFeeManagerAddress);

    // Deploy RateLimiter
    console.log("\n🚀 Deploying RateLimiter...");
    const RateLimiter = await hre.ethers.getContractFactory("RateLimiter");
    const rateLimiter = await RateLimiter.deploy(
        deployer.address // admin
    );
    await rateLimiter.waitForDeployment();
    const rateLimiterAddress = await rateLimiter.getAddress();
    console.log("✅ RateLimiter deployed to:", rateLimiterAddress);

    // Deploy TransactionOrchestrator
    console.log("\n🚀 Deploying TransactionOrchestrator...");
    const TransactionOrchestrator = await hre.ethers.getContractFactory("TransactionOrchestrator");
    const transactionOrchestrator = await TransactionOrchestrator.deploy(
        gasFeeManagerAddress, // gasFeeManager
        rateLimiterAddress, // rateLimiter
        deployer.address, // orchestratorFeeCollector
        deployer.address // admin
    );
    await transactionOrchestrator.waitForDeployment();
    const transactionOrchestratorAddress = await transactionOrchestrator.getAddress();
    console.log("✅ TransactionOrchestrator deployed to:", transactionOrchestratorAddress);

    // Skipping role grants and verification for MVP; defaults set in constructors
    console.log("\n⚙️ Skipping role grants for MVP (defaults from constructors will apply)");

    // Save deployment addresses
    const deploymentInfo = {
        network: hre.network.name,
        deployer: deployer.address,
        contracts: {
            kycRegistry: kycRegistryAddress,
            propertyTokenImpl: propertyTokenImplAddress,
            propertyFactory: propertyFactoryAddress,
            marketplace: marketplaceAddress,
            ownershipRegistry: ownershipRegistryAddress,
            gasFeeManager: gasFeeManagerAddress,
            rateLimiter: rateLimiterAddress,
            transactionOrchestrator: transactionOrchestratorAddress
        },
        timestamp: new Date().toISOString()
    };

    console.log("\n📋 Deployment Summary:");
    console.log(JSON.stringify(deploymentInfo, null, 2));

    // Save to file for verification
    const fs = require('fs');
    const deploymentPath = `deployments/${hre.network.name}.json`;
    
    // Ensure deployments directory exists
    if (!fs.existsSync('deployments')) {
        fs.mkdirSync('deployments');
    }
    
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n💾 Deployment info saved to: ${deploymentPath}`);

    console.log("\n🎉 All contracts deployed successfully!");
    console.log("\n📝 Next steps:");
    console.log("1. Verify contracts on Etherscan");
    console.log("2. Update frontend configuration with contract addresses");
    console.log("3. Start backend server");
    console.log("4. Test the complete MVP flow");
    
    console.log("\n📜 Contract Addresses for Frontend:");
    console.log(`KYC_REGISTRY="${kycRegistryAddress}"`);
    console.log(`PROPERTY_FACTORY="${propertyFactoryAddress}"`);
    console.log(`MARKETPLACE="${marketplaceAddress}"`);
    console.log(`OWNERSHIP_REGISTRY="${ownershipRegistryAddress}"`);
    console.log(`GAS_FEE_MANAGER="${gasFeeManagerAddress}"`);
    console.log(`RATE_LIMITER="${rateLimiterAddress}"`);
    console.log(`TRANSACTION_ORCHESTRATOR="${transactionOrchestratorAddress}"`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
