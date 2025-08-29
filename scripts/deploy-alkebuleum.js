const { ethers, upgrades } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    const network = hre.network.name;
    
    console.log("🚀 Deploying Welcome Home Property contracts to Alkebuleum!");
    console.log("Network:", network);
    console.log("Deployer:", deployer.address);
    console.log("Account balance:", ethers.utils.formatEther(await deployer.getBalance()));

    // Check if we're on the right network
    if (!network.includes('alkebuleum') && network !== 'localhost') {
        console.error("❌ This script is designed for Alkebuleum networks!");
        console.error("Use 'npm run deploy:alkebuleum' or 'npm run deploy:alkebuleum-testnet'");
        process.exit(1);
    }

    try {
        // Deploy KYC Registry
        console.log("\n📋 Deploying KYC Registry...");
        const KYCRegistry = await ethers.getContractFactory("KYCRegistry");
        const kycRegistry = await KYCRegistry.deploy();
        await kycRegistry.deployed();
        console.log("✅ KYCRegistry deployed to:", kycRegistry.address);

        // Deploy AlkebuleumPropertyToken implementation
        console.log("\n🏠 Deploying AlkebuleumPropertyToken implementation...");
        const AlkebuleumPropertyToken = await ethers.getContractFactory("AlkebuleumPropertyToken");
        
        // Create initial property info
        const initialPropertyInfo = {
            name: "Sample Property",
            description: "Initial property for testing",
            location: "Alkebuleum City",
            propertyType: 0, // RESIDENTIAL
            status: 0, // ACTIVE
            area: 1000, // 1000 sq meters
            latitude: 40000000, // 40.0 degrees * 1e6
            longitude: -74000000, // -74.0 degrees * 1e6
            valuation: 1000000 * 10**18, // 1M tokens
            valuationSource: 0, // APPRAISAL
            lastValuationDate: Math.floor(Date.now() / 1000),
            propertyContractId: "ALK001",
            transactionId: "0x0000000000000000000000000000000000000000000000000000000000000000",
            metadataUri: "ipfs://QmSample"
        };
        
        const alkebuleumPropertyTokenImpl = await AlkebuleumPropertyToken.deploy(
            "WelcomeHomeProperty", // name
            "WH", // symbol
            1000000 * 10**18, // maxTokens (1M tokens)
            kycRegistry.address, // kycRegistry
            initialPropertyInfo // propertyInfo
        );
        await alkebuleumPropertyTokenImpl.deployed();
        console.log("✅ AlkebuleumPropertyToken implementation deployed to:", alkebuleumPropertyTokenImpl.address);

        // Deploy PropertyFactory
        console.log("\n🏭 Deploying PropertyFactory...");
        const PropertyFactory = await ethers.getContractFactory("PropertyFactory");
        const propertyFactory = await PropertyFactory.deploy(
            alkebuleumPropertyTokenImpl.address, // implementation
            kycRegistry.address, // kycRegistry
            deployer.address // admin
        );
        await propertyFactory.deployed();
        console.log("✅ PropertyFactory deployed to:", propertyFactory.address);

        // Deploy Marketplace
        console.log("\n🛒 Deploying Marketplace...");
        const Marketplace = await ethers.getContractFactory("Marketplace");
        const marketplace = await Marketplace.deploy(
            kycRegistry.address, // kycRegistry
            deployer.address, // feeCollector
            250 // platformFee (2.5%)
        );
        await marketplace.deployed();
        console.log("✅ Marketplace deployed to:", marketplace.address);

        // Deploy OwnershipRegistry
        console.log("\n📊 Deploying OwnershipRegistry...");
        const OwnershipRegistry = await ethers.getContractFactory("OwnershipRegistry");
        const ownershipRegistry = await OwnershipRegistry.deploy(
            kycRegistry.address, // kycRegistry
            deployer.address // admin
        );
        await ownershipRegistry.deployed();
        console.log("✅ OwnershipRegistry deployed to:", ownershipRegistry.address);

        // Deploy TimelockController
        console.log("\n⏰ Deploying TimelockController...");
        const PropertyTimelockController = await ethers.getContractFactory("PropertyTimelockController");
        const timelockController = await PropertyTimelockController.deploy(
            24 * 60 * 60, // minDelay: 24 hours
            [propertyFactory.address], // proposers: PropertyFactory can propose
            [propertyFactory.address], // executors: PropertyFactory can execute
            deployer.address // admin
        );
        await timelockController.deployed();
        console.log("✅ PropertyTimelockController deployed to:", timelockController.address);

        // Deploy PropertyGovernance
        console.log("\n🗳️ Deploying PropertyGovernance...");
        const PropertyGovernance = await ethers.getContractFactory("PropertyGovernance");
        const propertyGovernance = await PropertyGovernance.deploy(
            alkebuleumPropertyTokenImpl.address, // governanceToken
            1000 * 10**18, // proposalThreshold (1000 tokens)
            1, // votingDelay (1 block)
            50400, // votingPeriod (1 week)
            4, // quorumPercentage (4%)
            86400 // timelockDelay (24 hours)
        );
        await propertyGovernance.deployed();
        console.log("✅ PropertyGovernance deployed to:", propertyGovernance.address);

        // Grant roles and permissions
        console.log("\n🔐 Setting up roles and permissions...");
        
        // Grant KYC verifier role to deployer
        await kycRegistry.grantRole(kycRegistry.KYC_VERIFIER_ROLE(), deployer.address);
        console.log("✅ Granted KYC_VERIFIER_ROLE to deployer");

        // Grant marketplace role to marketplace contract
        await kycRegistry.grantRole(kycRegistry.MARKETPLACE_ROLE(), marketplace.address);
        console.log("✅ Granted MARKETPLACE_ROLE to marketplace");

        // Grant factory role to property factory
        await kycRegistry.grantRole(kycRegistry.FACTORY_ROLE(), propertyFactory.address);
        console.log("✅ Granted FACTORY_ROLE to property factory");

        // Grant registry role to ownership registry
        await kycRegistry.grantRole(kycRegistry.REGISTRY_ROLE(), ownershipRegistry.address);
        console.log("✅ Granted REGISTRY_ROLE to ownership registry");

        // Grant governance role to property governance
        await kycRegistry.grantRole(kycRegistry.GOVERNANCE_ROLE(), propertyGovernance.address);
        console.log("✅ Granted GOVERNANCE_ROLE to property governance");

        // Grant timelock proposer and executor roles to governance
        await timelockController.grantRole(await timelockController.PROPOSER_ROLE(), propertyGovernance.address);
        await timelockController.grantRole(await timelockController.EXECUTOR_ROLE(), propertyGovernance.address);
        console.log("✅ Granted timelock roles to governance");

        // Revoke deployer's timelock roles (governance should control timelock)
        await timelockController.revokeRole(await timelockController.PROPOSER_ROLE(), deployer.address);
        await timelockController.revokeRole(await timelockController.EXECUTOR_ROLE(), deployer.address);
        console.log("✅ Revoked deployer's timelock roles");

        // Verify some initial setup
        console.log("\n🔍 Verifying deployment...");
        
        const deployerKYCVerifier = await kycRegistry.hasRole(kycRegistry.KYC_VERIFIER_ROLE(), deployer.address);
        console.log("✅ Deployer has KYC_VERIFIER_ROLE:", deployerKYCVerifier);
        
        const marketplaceRole = await kycRegistry.hasRole(kycRegistry.MARKETPLACE_ROLE(), marketplace.address);
        console.log("✅ Marketplace has MARKETPLACE_ROLE:", marketplaceRole);

        // Save deployment addresses
        const deploymentInfo = {
            network: network,
            deployer: deployer.address,
            chainId: await ethers.provider.getNetwork().then(n => n.chainId),
            contracts: {
                kycRegistry: kycRegistry.address,
                alkebuleumPropertyTokenImpl: alkebuleumPropertyTokenImpl.address,
                propertyFactory: propertyFactory.address,
                marketplace: marketplace.address,
                ownershipRegistry: ownershipRegistry.address,
                timelockController: timelockController.address,
                propertyGovernance: propertyGovernance.address
            },
            deploymentTime: new Date().toISOString(),
            alkebuleumSpecific: {
                propertyTypes: ["RESIDENTIAL", "COMMERCIAL", "INDUSTRIAL", "LAND", "MIXED_USE", "AGRICULTURAL"],
                propertyStatuses: ["ACTIVE", "MAINTENANCE", "SOLD", "FORECLOSED", "RENTED", "VACANT", "UNDER_CONSTRUCTION"],
                valuationSources: ["APPRAISAL", "MARKET_ANALYSIS", "AUTOMATED_VALUATION_MODEL", "COMPARABLE_SALES", "INCOME_APPROACH"]
            }
        };

        console.log("\n📋 Deployment Summary:");
        console.log(JSON.stringify(deploymentInfo, null, 2));

        // Save to file for verification
        const fs = require('fs');
        const deploymentPath = `deployments/${network}.json`;
        
        // Ensure deployments directory exists
        if (!fs.existsSync('deployments')) {
            fs.mkdirSync('deployments');
        }
        
        fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
        console.log(`\n💾 Deployment info saved to: ${deploymentPath}`);

        // Create a sample property for testing
        console.log("\n🏗️ Creating sample property for testing...");
        try {
            const tx = await propertyFactory.createProperty(
                "Sample Alkebuleum Property",
                "SAMPLE",
                1000000 * 10**18, // maxTokens
                100 * 10**18, // tokenPrice
                "ipfs://sample-alkebuleum-metadata",
                "123 Sample St, Alkebuleum City",
                500000 * 10**18, // propertyValue
                "TX-SAMPLE-001",
                "RESIDENTIAL", // propertyType
                "ACTIVE", // propertyStatus
                150, // propertyArea (sqm)
                "40.7128,-74.0060" // coordinates
            );
            
            const receipt = await tx.wait();
            console.log("✅ Sample property created successfully!");
            console.log("Transaction hash:", tx.hash);
        } catch (error) {
            console.log("⚠️ Sample property creation failed (this is normal for testing):", error.message);
        }

        console.log("\n🎉 All contracts deployed successfully to Alkebuleum!");
        console.log("\n📚 Next steps:");
        console.log("1. Verify contracts on Alkebuleum explorer");
        console.log("2. Run tests: npm run test");
        console.log("3. Check contract sizes: npm run size");
        console.log("4. Deploy to other networks:");
        console.log("   - Sepolia: npm run deploy:sepolia");
        console.log("   - Local: npm run deploy:local");
        console.log("\n🔗 Contract Addresses:");
        console.log("KYC Registry:", kycRegistry.address);
        console.log("Property Token Impl:", alkebuleumPropertyTokenImpl.address);
        console.log("Property Factory:", propertyFactory.address);
        console.log("Marketplace:", marketplace.address);
        console.log("Ownership Registry:", ownershipRegistry.address);
        console.log("Timelock Controller:", timelockController.address);
        console.log("Property Governance:", propertyGovernance.address);

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
