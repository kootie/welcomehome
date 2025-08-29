const { ethers } = require("hardhat");

/**
 * Example script demonstrating GasFeeManager usage
 * This script shows how to:
 * 1. Deploy GasFeeManager
 * 2. Deposit tokens
 * 3. Request and execute transactions
 * 4. Handle fees and refunds
 */
async function main() {
    const [deployer, user1, user2, feeCollector, gasProvider] = await ethers.getSigners();
    
    console.log("🚀 GasFeeManager Usage Example");
    console.log("Network:", hre.network.name);
    console.log("Deployer:", deployer.address);
    console.log("User1:", user1.address);
    console.log("User2:", user2.address);
    console.log("Fee Collector:", feeCollector.address);
    console.log("Gas Provider:", gasProvider.address);

    try {
        // Step 1: Deploy GasFeeManager
        console.log("\n📋 Step 1: Deploying GasFeeManager...");
        const GasFeeManager = await ethers.getContractFactory("GasFeeManager");
        const gasFeeManager = await GasFeeManager.deploy(
            feeCollector.address,
            gasProvider.address,
            deployer.address
        );
        await gasFeeManager.deployed();
        console.log("✅ GasFeeManager deployed to:", gasFeeManager.address);

        // Step 2: Deploy a mock target contract for testing
        console.log("\n🎯 Step 2: Deploying mock target contract...");
        const MockTarget = await ethers.getContractFactory("MockTarget");
        const mockTarget = await MockTarget.deploy();
        await mockTarget.deployed();
        console.log("✅ MockTarget deployed to:", mockTarget.address);

        // Step 3: User1 deposits native tokens
        console.log("\n💰 Step 3: User1 deposits native tokens...");
        const depositAmount = ethers.utils.parseEther("0.1");
        
        // Transfer some ETH to user1 for testing
        await deployer.sendTransaction({
            to: user1.address,
            value: ethers.utils.parseEther("1.0")
        });
        
        await gasFeeManager.connect(user1).depositNative({ value: depositAmount });
        console.log("✅ User1 deposited", ethers.utils.formatEther(depositAmount), "ETH");

        // Check user1's balance
        const user1Balance = await gasFeeManager.getUserBalance(user1.address, ethers.constants.AddressZero);
        console.log("📊 User1's balance:", ethers.utils.formatEther(user1Balance), "ETH");

        // Step 4: User1 requests a transaction
        console.log("\n📝 Step 4: User1 requests a transaction...");
        const gasLimit = 100000;
        const maxFeePerGas = ethers.utils.parseUnits("20", "gwei");
        const maxPriorityFeePerGas = ethers.utils.parseUnits("2", "gwei");
        const tokenAmount = gasLimit * maxFeePerGas;

        // Prepare transaction data to call mockTarget.setValue(42)
        const mockTargetInterface = new ethers.utils.Interface([
            "function setValue(uint256 _value)"
        ]);
        const setValueData = mockTargetInterface.encodeFunctionData("setValue", [42]);

        const requestTx = await gasFeeManager.connect(user1).requestTransaction(
            mockTarget.address,
            0, // No ETH value
            setValueData,
            gasLimit,
            maxFeePerGas,
            maxPriorityFeePerGas,
            ethers.constants.AddressZero, // Native token
            tokenAmount
        );

        const requestReceipt = await requestTx.wait();
        const requestEvent = requestReceipt.events.find(e => e.event === "TransactionRequested");
        const requestId = requestEvent.args.requestId;
        console.log("✅ Transaction requested with ID:", requestId.toString());

        // Step 5: Gas provider executes the transaction
        console.log("\n⚡ Step 5: Gas provider executes the transaction...");
        const executeTx = await gasFeeManager.connect(gasProvider).executeTransaction(requestId);
        const executeReceipt = await executeTx.wait();
        const executeEvent = executeReceipt.events.find(e => e.event === "TransactionExecuted");
        
        console.log("✅ Transaction executed successfully:", executeEvent.args.success);
        console.log("📊 Gas used:", executeEvent.args.gasUsed.toString());

        // Step 6: Verify the transaction worked
        console.log("\n🔍 Step 6: Verifying transaction result...");
        const targetValue = await mockTarget.value();
        console.log("✅ MockTarget value set to:", targetValue.toString());

        // Step 7: Check fee distribution
        console.log("\n💸 Step 7: Checking fee distribution...");
        const feeCollectorBalance = await ethers.provider.getBalance(feeCollector.address);
        const gasProviderBalance = await ethers.provider.getBalance(gasProvider.address);
        const user1NewBalance = await gasFeeManager.getUserBalance(user1.address, ethers.constants.AddressZero);
        
        console.log("📊 Fee Collector balance:", ethers.utils.formatEther(feeCollectorBalance), "ETH");
        console.log("📊 Gas Provider balance:", ethers.utils.formatEther(gasProviderBalance), "ETH");
        console.log("📊 User1 remaining balance:", ethers.utils.formatEther(user1NewBalance), "ETH");

        // Step 8: Demonstrate ERC20 token usage
        console.log("\n🪙 Step 8: Demonstrating ERC20 token usage...");
        
        // Deploy mock ERC20 token
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const mockToken = await MockERC20.deploy("Test Token", "TEST");
        await mockToken.deployed();
        console.log("✅ MockERC20 deployed to:", mockToken.address);

        // Mint tokens to user2
        const tokenAmount2 = ethers.utils.parseEther("1000");
        await mockToken.mint(user2.address, tokenAmount2);
        console.log("✅ Minted", ethers.utils.formatEther(tokenAmount2), "tokens to User2");

        // User2 approves and deposits tokens
        await mockToken.connect(user2).approve(gasFeeManager.address, tokenAmount2);
        await gasFeeManager.connect(user2).depositTokens(mockToken.address, ethers.utils.parseEther("100"));
        console.log("✅ User2 deposited 100 tokens");

        // Check user2's token balance
        const user2TokenBalance = await gasFeeManager.getUserBalance(user2.address, mockToken.address);
        console.log("📊 User2's token balance:", ethers.utils.formatEther(user2TokenBalance), "tokens");

        // Step 9: Demonstrate transaction with ERC20 tokens
        console.log("\n🔄 Step 9: Transaction with ERC20 tokens...");
        
        const gasLimit2 = 80000;
        const maxFeePerGas2 = ethers.utils.parseUnits("15", "gwei");
        const tokenAmountForGas = gasLimit2 * maxFeePerGas2;

        // Prepare transaction data to call mockTarget.setData("Hello from ERC20")
        const setDataData = mockTargetInterface.encodeFunctionData("setData", ["Hello from ERC20"]);

        const requestTx2 = await gasFeeManager.connect(user2).requestTransaction(
            mockTarget.address,
            0,
            setDataData,
            gasLimit2,
            maxFeePerGas2,
            maxFeePerGas2,
            mockToken.address, // ERC20 token
            tokenAmountForGas
        );

        const requestReceipt2 = await requestTx2.wait();
        const requestEvent2 = requestReceipt2.events.find(e => e.event === "TransactionRequested");
        const requestId2 = requestEvent2.args.requestId;
        console.log("✅ ERC20 transaction requested with ID:", requestId2.toString());

        // Execute the transaction
        const executeTx2 = await gasFeeManager.connect(gasProvider).executeTransaction(requestId2);
        const executeReceipt2 = await executeTx2.wait();
        const executeEvent2 = executeReceipt2.events.find(e => e.event === "TransactionExecuted");
        
        console.log("✅ ERC20 transaction executed successfully:", executeEvent2.args.success);

        // Verify the transaction worked
        const targetData = await mockTarget.data();
        console.log("✅ MockTarget data set to:", targetData);

        // Step 10: Demonstrate withdrawal
        console.log("\n💳 Step 10: Demonstrating withdrawals...");
        
        // User1 withdraws some native tokens
        const withdrawAmount = ethers.utils.parseEther("0.02");
        await gasFeeManager.connect(user1).withdrawNative(withdrawAmount);
        console.log("✅ User1 withdrew", ethers.utils.formatEther(withdrawAmount), "ETH");

        // User2 withdraws some ERC20 tokens
        const withdrawTokenAmount = ethers.utils.parseEther("20");
        await gasFeeManager.connect(user2).withdrawTokens(mockToken.address, withdrawTokenAmount);
        console.log("✅ User2 withdrew", ethers.utils.formatEther(withdrawTokenAmount), "tokens");

        // Final balance check
        const user1FinalBalance = await gasFeeManager.getUserBalance(user1.address, ethers.constants.AddressZero);
        const user2FinalTokenBalance = await gasFeeManager.getUserBalance(user2.address, mockToken.address);
        
        console.log("\n📊 Final Balances:");
        console.log("User1 native balance:", ethers.utils.formatEther(user1FinalBalance), "ETH");
        console.log("User2 token balance:", ethers.utils.formatEther(user2FinalTokenBalance), "tokens");

        // Step 11: Demonstrate admin functions
        console.log("\n⚙️ Step 11: Demonstrating admin functions...");
        
        // Update gas configuration for Sepolia
        const newBaseGasPrice = ethers.utils.parseUnits("25", "gwei");
        const newMaxGasPrice = ethers.utils.parseUnits("120", "gwei");
        const newGasLimit = 400000;
        const newPriorityFee = ethers.utils.parseUnits("3", "gwei");

        await gasFeeManager.connect(deployer).updateGasConfig(
            11155111, // Sepolia chain ID
            newBaseGasPrice,
            newMaxGasPrice,
            newGasLimit,
            newPriorityFee,
            true
        );
        console.log("✅ Updated Sepolia gas configuration");

        // Check the updated configuration
        const updatedConfig = await gasFeeManager.getGasConfig(11155111);
        console.log("📊 Updated Sepolia config:");
        console.log("  - Base Gas Price:", ethers.utils.formatUnits(updatedConfig.baseGasPrice, "gwei"), "gwei");
        console.log("  - Max Gas Price:", ethers.utils.formatUnits(updatedConfig.maxGasPrice, "gwei"), "gwei");
        console.log("  - Gas Limit:", updatedConfig.gasLimit.toString());
        console.log("  - Priority Fee:", ethers.utils.formatUnits(updatedConfig.priorityFee, "gwei"), "gwei");

        console.log("\n🎉 GasFeeManager usage example completed successfully!");
        console.log("\n📚 Key takeaways:");
        console.log("1. Users can deposit both native and ERC20 tokens");
        console.log("2. Gas fees are automatically calculated and distributed");
        console.log("3. Transactions are executed by authorized gas providers");
        console.log("4. Platform and gas provider fees are collected automatically");
        console.log("5. Users can withdraw their remaining balances");
        console.log("6. Admin can update configurations for different networks");

    } catch (error) {
        console.error("❌ Example failed:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
