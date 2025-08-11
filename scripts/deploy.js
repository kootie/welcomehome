const { ethers, upgrades } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // Deploy KYC Registry
    console.log("\nDeploying KYC Registry...");
    const KYCRegistry = await ethers.getContractFactory("KYCRegistry");
    const kycRegistry = await KYCRegistry.deploy();
    await kycRegistry.deployed();
    console.log("KYCRegistry deployed to:", kycRegistry.address);

    // Deploy PropertyToken implementation
    console.log("\nDeploying PropertyToken implementation...");
    const PropertyToken = await ethers.getContractFactory("PropertyToken");
    const propertyTokenImpl = await PropertyToken.deploy(
        "WelcomeHomeProperty", // name
        "WH", // symbol
        1000000 * 10**18, // maxTokens (1M tokens)
        kycRegistry.address, // kycRegistry
        deployer.address // admin
    );
    await propertyTokenImpl.deployed();
    console.log("PropertyToken implementation deployed to:", propertyTokenImpl.address);

    // Deploy PropertyFactory
    console.log("\nDeploying PropertyFactory...");
    const PropertyFactory = await ethers.getContractFactory("PropertyFactory");
    const propertyFactory = await PropertyFactory.deploy(
        propertyTokenImpl.address, // implementation
        kycRegistry.address, // kycRegistry
        deployer.address // admin
    );
    await propertyFactory.deployed();
    console.log("PropertyFactory deployed to:", propertyFactory.address);

    // Deploy Marketplace
    console.log("\nDeploying Marketplace...");
    const Marketplace = await ethers.getContractFactory("Marketplace");
    const marketplace = await Marketplace.deploy(
        kycRegistry.address, // kycRegistry
        deployer.address, // feeCollector
        250 // platformFee (2.5%)
    );
    await marketplace.deployed();
    console.log("Marketplace deployed to:", marketplace.address);

    // Deploy OwnershipRegistry
    console.log("\nDeploying OwnershipRegistry...");
    const OwnershipRegistry = await ethers.getContractFactory("OwnershipRegistry");
    const ownershipRegistry = await OwnershipRegistry.deploy(
        kycRegistry.address, // kycRegistry
        deployer.address // admin
    );
    await ownershipRegistry.deployed();
    console.log("OwnershipRegistry deployed to:", ownershipRegistry.address);

    // Deploy TimelockController
    console.log("\nDeploying TimelockController...");
    const PropertyTimelockController = await ethers.getContractFactory("PropertyTimelockController");
    const timelockController = await PropertyTimelockController.deploy(
        24 * 60 * 60, // minDelay: 24 hours
        [propertyFactory.address], // proposers: PropertyFactory can propose
        [propertyFactory.address], // executors: PropertyFactory can execute
        deployer.address // admin
    );
    await timelockController.deployed();
    console.log("PropertyTimelockController deployed to:", timelockController.address);

    // Deploy PropertyGovernance
    console.log("\nDeploying PropertyGovernance...");
    const PropertyGovernance = await ethers.getContractFactory("PropertyGovernance");
    const propertyGovernance = await PropertyGovernance.deploy(
        propertyTokenImpl.address, // propertyToken
        timelockController.address, // timelock
        deployer.address // admin
    );
    await propertyGovernance.deployed();
    console.log("PropertyGovernance deployed to:", propertyGovernance.address);

    // Grant roles and permissions
    console.log("\nSetting up roles and permissions...");
    
    // Grant KYC verifier role to deployer
    await kycRegistry.grantRole(kycRegistry.KYC_VERIFIER_ROLE(), deployer.address);
    console.log("Granted KYC_VERIFIER_ROLE to deployer");

    // Grant marketplace role to marketplace contract
    await kycRegistry.grantRole(kycRegistry.MARKETPLACE_ROLE(), marketplace.address);
    console.log("Granted MARKETPLACE_ROLE to marketplace");

    // Grant factory role to property factory
    await kycRegistry.grantRole(kycRegistry.FACTORY_ROLE(), propertyFactory.address);
    console.log("Granted FACTORY_ROLE to property factory");

    // Grant registry role to ownership registry
    await kycRegistry.grantRole(kycRegistry.REGISTRY_ROLE(), ownershipRegistry.address);
    console.log("Granted REGISTRY_ROLE to ownership registry");

    // Grant governance role to property governance
    await kycRegistry.grantRole(kycRegistry.GOVERNANCE_ROLE(), propertyGovernance.address);
    console.log("Granted GOVERNANCE_ROLE to property governance");

    // Grant timelock proposer and executor roles to governance
    await timelockController.grantRole(await timelockController.PROPOSER_ROLE(), propertyGovernance.address);
    await timelockController.grantRole(await timelockController.EXECUTOR_ROLE(), propertyGovernance.address);
    console.log("Granted timelock roles to governance");

    // Revoke deployer's timelock roles (governance should control timelock)
    await timelockController.revokeRole(await timelockController.PROPOSER_ROLE(), deployer.address);
    await timelockController.revokeRole(await timelockController.EXECUTOR_ROLE(), deployer.address);
    console.log("Revoked deployer's timelock roles");

    // Verify some initial setup
    console.log("\nVerifying deployment...");
    
    const deployerKYCVerifier = await kycRegistry.hasRole(kycRegistry.KYC_VERIFIER_ROLE(), deployer.address);
    console.log("Deployer has KYC_VERIFIER_ROLE:", deployerKYCVerifier);
    
    const marketplaceRole = await kycRegistry.hasRole(kycRegistry.MARKETPLACE_ROLE(), marketplace.address);
    console.log("Marketplace has MARKETPLACE_ROLE:", marketplaceRole);

    // Save deployment addresses
    const deploymentInfo = {
        network: hre.network.name,
        deployer: deployer.address,
        contracts: {
            kycRegistry: kycRegistry.address,
            propertyTokenImpl: propertyTokenImpl.address,
            propertyFactory: propertyFactory.address,
            marketplace: marketplace.address,
            ownershipRegistry: ownershipRegistry.address,
            timelockController: timelockController.address,
            propertyGovernance: propertyGovernance.address
        },
        timestamp: new Date().toISOString()
    };

    console.log("\nDeployment Summary:");
    console.log(JSON.stringify(deploymentInfo, null, 2));

    // Save to file for verification
    const fs = require('fs');
    const deploymentPath = `deployments/${hre.network.name}.json`;
    
    // Ensure deployments directory exists
    if (!fs.existsSync('deployments')) {
        fs.mkdirSync('deployments');
    }
    
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\nDeployment info saved to: ${deploymentPath}`);

    console.log("\n🎉 All contracts deployed successfully!");
    console.log("\nNext steps:");
    console.log("1. Verify contracts on Etherscan (if on testnet/mainnet)");
    console.log("2. Run tests: npm run test");
    console.log("3. Start local node: npm run node");
    console.log("4. Deploy to localhost: npm run deploy:local");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
