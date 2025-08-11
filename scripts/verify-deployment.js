const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Verifying Welcome Home Property deployment...\n");

  try {
    // Load deployment info
    const fs = require("fs");
    const network = hre.network.name;
    const deploymentFile = `deployment-${network}.json`;
    
    if (!fs.existsSync(deploymentFile)) {
      console.log(`❌ Deployment file not found: ${deploymentFile}`);
      console.log("Please run the deployment script first.");
      return;
    }

    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    console.log(`📋 Deployment Info for ${network}:`);
    console.log(`   Deployer: ${deploymentInfo.deployer}`);
    console.log(`   Block: ${deploymentInfo.blockNumber}`);
    console.log(`   Timestamp: ${deploymentInfo.timestamp}\n`);

    // Get contract instances
    const [deployer] = await ethers.getSigners();
    
    console.log("🏗️  Loading deployed contracts...");
    
    const kycRegistry = await ethers.getContractAt("KYCRegistry", deploymentInfo.contracts.kycRegistry);
    const propertyFactory = await ethers.getContractAt("PropertyFactory", deploymentInfo.contracts.propertyFactory);
    const marketplace = await ethers.getContractAt("Marketplace", deploymentInfo.contracts.marketplace);
    const ownershipRegistry = await ethers.getContractAt("OwnershipRegistry", deploymentInfo.contracts.ownershipRegistry);

    console.log("✅ Contracts loaded successfully\n");

    // Verify KYC Registry
    console.log("🔐 Verifying KYC Registry...");
    const kycAdmin = await kycRegistry.hasRole(await kycRegistry.DEFAULT_ADMIN_ROLE(), deployer.address);
    const kycVerifier = await kycRegistry.hasRole(await kycRegistry.VERIFIER_ROLE(), deployer.address);
    
    console.log(`   Admin Role: ${kycAdmin ? "✅" : "❌"}`);
    console.log(`   Verifier Role: ${kycVerifier ? "✅" : "❌"}`);
    console.log(`   Max KYC Level: ${await kycRegistry.getMaxKYCLevel()}`);
    console.log(`   Total Verified: ${await kycRegistry.getTotalVerified()}\n`);

    // Verify Property Factory
    console.log("🏠 Verifying Property Factory...");
    const factoryAdmin = await propertyFactory.hasRole(await propertyFactory.ADMIN_ROLE(), deployer.address);
    const factoryCreator = await propertyFactory.hasRole(await propertyFactory.CREATOR_ROLE(), deployer.address);
    
    console.log(`   Admin Role: ${factoryAdmin ? "✅" : "❌"}`);
    console.log(`   Creator Role: ${factoryCreator ? "✅" : "❌"}`);
    console.log(`   KYC Registry: ${await propertyFactory.kycRegistry()}`);
    console.log(`   Fee Collector: ${await propertyFactory.feeCollector()}`);
    console.log(`   Platform Fee: ${await propertyFactory.platformFee()} basis points`);
    console.log(`   Total Properties: ${await propertyFactory.getTotalProperties()}\n`);

    // Verify Marketplace
    console.log("🛒 Verifying Marketplace...");
    const marketAdmin = await marketplace.hasRole(await marketplace.ADMIN_ROLE(), deployer.address);
    const marketLister = await marketplace.hasRole(await marketplace.LISTER_ROLE(), deployer.address);
    
    console.log(`   Admin Role: ${marketAdmin ? "✅" : "❌"}`);
    console.log(`   Lister Role: ${marketLister ? "✅" : "❌"}`);
    console.log(`   KYC Registry: ${await marketplace.kycRegistry()}`);
    console.log(`   Fee Collector: ${await marketplace.feeCollector()}`);
    console.log(`   Platform Fee: ${await marketplace.platformFee()} basis points`);
    console.log(`   Total Listings: ${await marketplace.getTotalListings()}\n`);

    // Verify Ownership Registry
    console.log("📊 Verifying Ownership Registry...");
    const registryAdmin = await ownershipRegistry.hasRole(await ownershipRegistry.ADMIN_ROLE(), deployer.address);
    const registryRegistrar = await ownershipRegistry.hasRole(await ownershipRegistry.REGISTRAR_ROLE(), deployer.address);
    
    console.log(`   Admin Role: ${registryAdmin ? "✅" : "❌"}`);
    console.log(`   Registrar Role: ${registryRegistrar ? "✅" : "❌"}`);
    console.log(`   KYC Registry: ${await ownershipRegistry.kycRegistry()}`);
    
    const stats = await ownershipRegistry.getPlatformStats();
    console.log(`   Total Properties: ${stats.totalPropertiesCount}`);
    console.log(`   Total Users: ${stats.totalUsersCount}`);
    console.log(`   Total Transfers: ${stats.totalTransfers}`);
    console.log(`   Active Properties: ${stats.activeProperties}\n`);

    // Test basic functionality
    console.log("🧪 Testing basic functionality...");
    
    // Test KYC verification
    const testUser = ethers.Wallet.createRandom().address;
    console.log(`   Testing KYC verification for: ${testUser}`);
    
    await kycRegistry.verifyAddress(testUser, 1);
    const isVerified = await kycRegistry.isVerified(testUser);
    console.log(`   KYC Verification: ${isVerified ? "✅" : "❌"}`);

    // Test property creation
    console.log("   Testing property creation...");
    const expiresAt = Math.floor(Date.now() / 1000) + 86400; // 24 hours
    
    const tx = await propertyFactory.createProperty(
      "Test Property",
      "TEST",
      ethers.utils.parseEther("1000000"),
      ethers.utils.parseEther("0.001"),
      "ipfs://test",
      expiresAt
    );
    
    const receipt = await tx.wait();
    const event = receipt.events.find(e => e.event === "PropertyCreated");
    const propertyId = event.args.propertyId;
    
    console.log(`   Property Created: ${propertyId} ✅`);
    
    // Test marketplace listing
    console.log("   Testing marketplace listing...");
    const listingTx = await marketplace.createListing(
      propertyId,
      ethers.utils.parseEther("1000"),
      ethers.utils.parseEther("0.002"),
      "ipfs://listing"
    );
    
    const listingReceipt = await listingTx.wait();
    const listingEvent = listingReceipt.events.find(e => e.event === "ListingCreated");
    const listingId = listingEvent.args.listingId;
    
    console.log(`   Marketplace Listing: ${listingId} ✅`);

    // Test ownership registry
    console.log("   Testing ownership registry...");
    const property = await propertyFactory.getProperty(propertyId);
    
    await ownershipRegistry.registerProperty(
      property.tokenAddress,
      "Test Property",
      "TEST",
      ethers.utils.parseEther("1000000")
    );
    
    console.log("   Property Registered ✅");

    console.log("\n🎉 All verification tests passed!");
    console.log("\n📋 Summary:");
    console.log(`   Network: ${network}`);
    console.log(`   KYC Registry: ${deploymentInfo.contracts.kycRegistry}`);
    console.log(`   Property Factory: ${deploymentInfo.contracts.propertyFactory}`);
    console.log(`   Marketplace: ${deploymentInfo.contracts.marketplace}`);
    console.log(`   Ownership Registry: ${deploymentInfo.contracts.ownershipRegistry}`);
    console.log(`   Test Property ID: ${propertyId}`);
    console.log(`   Test Listing ID: ${listingId}`);

  } catch (error) {
    console.error("❌ Verification failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  });
