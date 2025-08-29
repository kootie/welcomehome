const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    const network = hre.network.name;
    
    console.log("🚀 Deploying Welcome Home Property contracts to Sepolia!");
    console.log("Network:", network);
    console.log("Deployer:", deployer.address);
    console.log("Account balance:", ethers.formatEther(await deployer.getBalance()));

    // Check if we're on Sepolia
    if (network !== 'sepolia') {
        console.error("❌ This script is designed for Sepolia testnet!");
        console.error("Use: npx hardhat run scripts/deploy-sepolia.js --network sepolia");
        process.exit(1);
    }

    try {
        // Deploy KYC Registry
        console.log("\n📋 Deploying KYC Registry...");
        const KYCRegistry = await ethers.getContractFactory("KYCRegistry");
        const kycRegistry = await KYCRegistry.deploy();
        await kycRegistry.waitForDeployment();
        console.log("✅ KYCRegistry deployed to:", await kycRegistry.getAddress());

        // Deploy AlkebuleumPropertyToken implementation
        console.log("\n🏠 Deploying AlkebuleumPropertyToken implementation...");
        const AlkebuleumPropertyToken = await ethers.getContractFactory("AlkebuleumPropertyToken");
        
        // Create initial property info
        const initialPropertyInfo = {
            name: "Sample Property",
            description: "Initial property for testing",
            location: "Sepolia Test City",
            propertyType: 0, // RESIDENTIAL
            status: 0, // ACTIVE
            area: 1000, // 1000 sq meters
            latitude: 40000000, // 40.0 degrees * 1e6
            longitude: -74000000, // -74.0 degrees * 1e6
            valuation: 1000000 * 10**18, // 1M tokens
            valuationSource: 0, // APPRAISAL
            lastValuationDate: Math.floor(Date.now() / 1000),
            propertyContractId: "SEP001",
            transactionId: "0x0000000000000000000000000000000000000000000000000000000000000000",
            metadataUri: "ipfs://QmSample"
        };
        
        const alkebuleumPropertyTokenImpl = await AlkebuleumPropertyToken.deploy(
            "WelcomeHomeProperty",
            "WH",
            1000000 * 10**18, // 1M tokens
            await kycRegistry.getAddress(),
            initialPropertyInfo
        );
        await alkebuleumPropertyTokenImpl.waitForDeployment();
        console.log("✅ AlkebuleumPropertyToken implementation deployed to:", await alkebuleumPropertyTokenImpl.getAddress());

        // Deploy PropertyFactory
        console.log("\n🏭 Deploying PropertyFactory...");
        const PropertyFactory = await ethers.getContractFactory("PropertyFactory");
        const propertyFactory = await PropertyFactory.deploy(
            await alkebuleumPropertyTokenImpl.getAddress(),
            await kycRegistry.getAddress(),
            deployer.address
        );
        await propertyFactory.waitForDeployment();
        console.log("✅ PropertyFactory deployed to:", await propertyFactory.getAddress());

        // Deploy Marketplace
        console.log("\n🛒 Deploying Marketplace...");
        const Marketplace = await ethers.getContractFactory("Marketplace");
        const marketplace = await Marketplace.deploy(
            await kycRegistry.getAddress(),
            deployer.address,
            250 // 2.5% fee
        );
        await marketplace.waitForDeployment();
        console.log("✅ Marketplace deployed to:", await marketplace.getAddress());

        // Deploy OwnershipRegistry
        console.log("\n📊 Deploying OwnershipRegistry...");
        const OwnershipRegistry = await ethers.getContractFactory("OwnershipRegistry");
        const ownershipRegistry = await OwnershipRegistry.deploy(
            await kycRegistry.getAddress(),
            deployer.address
        );
        await ownershipRegistry.waitForDeployment();
        console.log("✅ OwnershipRegistry deployed to:", await ownershipRegistry.getAddress());

        // Deploy TimelockController
        console.log("\n⏰ Deploying TimelockController...");
        const PropertyTimelockController = await ethers.getContractFactory("PropertyTimelockController");
        const timelockController = await PropertyTimelockController.deploy(
            24 * 60 * 60, // minDelay: 24 hours
            [await propertyFactory.getAddress()], // proposers: PropertyFactory can propose
            [await propertyFactory.getAddress()], // executors: PropertyFactory can execute
            deployer.address // admin
        );
        await timelockController.waitForDeployment();
        console.log("✅ PropertyTimelockController deployed to:", await timelockController.getAddress());

        // Deploy PropertyGovernance
        console.log("\n🗳️ Deploying PropertyGovernance...");
        const PropertyGovernance = await ethers.getContractFactory("PropertyGovernance");
        const propertyGovernance = await PropertyGovernance.deploy(
            await alkebuleumPropertyTokenImpl.getAddress(), // governanceToken
            1000 * 10**18, // proposalThreshold (1000 tokens)
            1, // votingDelay (1 block)
            50400, // votingPeriod (1 week)
            4, // quorumPercentage (4%)
            86400 // timelockDelay (24 hours)
        );
        await propertyGovernance.waitForDeployment();
        console.log("✅ PropertyGovernance deployed to:", await propertyGovernance.getAddress());

        // Grant roles and permissions
        console.log("\n🔐 Setting up roles and permissions...");
        
        // Grant KYC verifier role to deployer
        await kycRegistry.grantRole(await kycRegistry.KYC_VERIFIER_ROLE(), deployer.address);
        console.log("✅ Granted KYC_VERIFIER_ROLE to deployer");

        // Grant marketplace role to marketplace contract
        await kycRegistry.grantRole(await kycRegistry.MARKETPLACE_ROLE(), await marketplace.getAddress());
        console.log("✅ Granted MARKETPLACE_ROLE to marketplace");

        // Grant factory role to property factory
        await kycRegistry.grantRole(await kycRegistry.FACTORY_ROLE(), await propertyFactory.getAddress());
        console.log("✅ Granted FACTORY_ROLE to property factory");

        // Grant registry role to ownership registry
        await kycRegistry.grantRole(await kycRegistry.REGISTRY_ROLE(), await ownershipRegistry.getAddress());
        console.log("✅ Granted REGISTRY_ROLE to ownership registry");

        // Grant governance role to property governance
        await kycRegistry.grantRole(await kycRegistry.GOVERNANCE_ROLE(), await propertyGovernance.getAddress());
        console.log("✅ Granted GOVERNANCE_ROLE to property governance");

        // Grant timelock proposer and executor roles to governance
        await timelockController.grantRole(await timelockController.PROPOSER_ROLE(), await propertyGovernance.getAddress());
        await timelockController.grantRole(await timelockController.EXECUTOR_ROLE(), await propertyGovernance.getAddress());
        console.log("✅ Granted timelock roles to governance");

        // Revoke deployer's timelock roles (governance should control timelock)
        await timelockController.revokeRole(await timelockController.PROPOSER_ROLE(), deployer.address);
        await timelockController.revokeRole(await timelockController.EXECUTOR_ROLE(), deployer.address);
        console.log("✅ Revoked deployer's timelock roles");

        // Save deployment addresses
        const deploymentInfo = {
            network: network,
            deployer: deployer.address,
            chainId: await ethers.provider.getNetwork().then(n => n.chainId),
            contracts: {
                kycRegistry: await kycRegistry.getAddress(),
                alkebuleumPropertyTokenImpl: await alkebuleumPropertyTokenImpl.getAddress(),
                propertyFactory: await propertyFactory.getAddress(),
                marketplace: await marketplace.getAddress(),
                ownershipRegistry: await ownershipRegistry.getAddress(),
                timelockController: await timelockController.getAddress(),
                propertyGovernance: await propertyGovernance.getAddress()
            },
            deploymentTime: new Date().toISOString(),
            explorerUrl: "https://sepolia.etherscan.io"
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

        console.log("\n🎉 All contracts deployed successfully to Sepolia!");
        console.log("\n📚 Next steps:");
        console.log("1. Verify contracts on Etherscan: https://sepolia.etherscan.io");
        console.log("2. Test the deployed contracts");
        console.log("3. Deploy to mainnet when ready");
        console.log("\n🔗 Contract Addresses:");
        console.log("KYC Registry:", await kycRegistry.getAddress());
        console.log("Property Token Impl:", await alkebuleumPropertyTokenImpl.getAddress());
        console.log("Property Factory:", await propertyFactory.getAddress());
        console.log("Marketplace:", await marketplace.getAddress());
        console.log("Ownership Registry:", await ownershipRegistry.getAddress());
        console.log("Timelock Controller:", await timelockController.getAddress());
        console.log("Property Governance:", await propertyGovernance.getAddress());

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
