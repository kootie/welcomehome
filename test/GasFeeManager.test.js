const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GasFeeManager", function () {
    let GasFeeManager;
    let gasFeeManager;
    let owner;
    let feeCollector;
    let gasProvider;
    let user1;
    let user2;
    let user3;

    const ALKEBULEUM_CHAIN_ID = 1337;
    const SEPOLIA_CHAIN_ID = 11155111;

    beforeEach(async function () {
        [owner, feeCollector, gasProvider, user1, user2, user3] = await ethers.getSigners();

        GasFeeManager = await ethers.getContractFactory("GasFeeManager");
        gasFeeManager = await GasFeeManager.deploy(
            feeCollector.address,
            gasProvider.address,
            owner.address
        );

    });

    describe("Deployment", function () {
        it("Should deploy with correct initial configuration", async function () {
            expect(await gasFeeManager.feeCollector()).to.equal(feeCollector.address);
            expect(await gasFeeManager.gasProvider()).to.equal(gasProvider.address);
            expect(await gasFeeManager.platformFeePercentage()).to.equal(50); // 0.5%
            expect(await gasFeeManager.gasProviderFeePercentage()).to.equal(100); // 1%
        });

        it("Should set up correct roles", async function () {
            expect(await gasFeeManager.hasRole(await gasFeeManager.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
            expect(await gasFeeManager.hasRole(await gasFeeManager.ADMIN_ROLE(), owner.address)).to.be.true;
            expect(await gasFeeManager.hasRole(await gasFeeManager.OPERATOR_ROLE(), owner.address)).to.be.true;
            expect(await gasFeeManager.hasRole(await gasFeeManager.GAS_PROVIDER_ROLE(), gasProvider.address)).to.be.true;
        });

        it("Should initialize gas configurations for supported networks", async function () {
            const alkebuleumConfig = await gasFeeManager.getGasConfig(ALKEBULEUM_CHAIN_ID);
            const sepoliaConfig = await gasFeeManager.getGasConfig(SEPOLIA_CHAIN_ID);

            expect(alkebuleumConfig.baseGasPrice).to.equal(ethers.parseUnits("1", "gwei"));
            expect(alkebuleumConfig.maxGasPrice).to.equal(ethers.parseUnits("50", "gwei"));
            expect(alkebuleumConfig.gasLimit).to.equal(300000);
            expect(alkebuleumConfig.isActive).to.be.true;

            expect(sepoliaConfig.baseGasPrice).to.equal(ethers.parseUnits("20", "gwei"));
            expect(sepoliaConfig.maxGasPrice).to.equal(ethers.parseUnits("100", "gwei"));
            expect(sepoliaConfig.gasLimit).to.equal(300000);
            expect(sepoliaConfig.isActive).to.be.true;
        });
    });

    describe("Native Token Operations", function () {
        it("Should allow users to deposit native tokens", async function () {
            const depositAmount = ethers.parseEther("1.0");
            
            await gasFeeManager.connect(user1).depositNative({ value: depositAmount });
            
            const balance = await gasFeeManager.getUserBalance(user1.address, ethers.ZeroAddress);
            expect(balance).to.equal(depositAmount);
        });

        it("Should allow users to withdraw native tokens", async function () {
            const depositAmount = ethers.parseEther("1.0");
            const withdrawAmount = ethers.parseEther("0.5");
            
            await gasFeeManager.connect(user1).depositNative({ value: depositAmount });
            await gasFeeManager.connect(user1).withdrawNative(withdrawAmount);
            
            const balance = await gasFeeManager.getUserBalance(user1.address, ethers.ZeroAddress);
            expect(balance).to.equal(depositAmount - withdrawAmount);
        });

        it("Should reject deposits below minimum amount", async function () {
            const smallAmount = ethers.parseEther("0.0001"); // Below 0.001 ETH minimum
            
            await expect(
                gasFeeManager.connect(user1).depositNative({ value: smallAmount })
            ).to.be.revertedWith("Amount below minimum");
        });

        it("Should reject deposits above maximum amount", async function () {
            const largeAmount = ethers.parseEther("200"); // Above 100 ETH maximum
            
            await expect(
                gasFeeManager.connect(user1).depositNative({ value: largeAmount })
            ).to.be.revertedWith("Amount above maximum");
        });

        it("Should reject withdrawals with insufficient balance", async function () {
            const withdrawAmount = ethers.parseEther("1.0");
            
            await expect(
                gasFeeManager.connect(user1).withdrawNative(withdrawAmount)
            ).to.be.revertedWith("Insufficient balance");
        });
    });

    describe("ERC20 Token Operations", function () {
        let mockToken;

        beforeEach(async function () {
            // Deploy a mock ERC20 token for testing
            const MockToken = await ethers.getContractFactory("MockERC20");
            mockToken = await MockToken.deploy("Mock Token", "MTK", owner.address);


            // Mint tokens to users
            await mockToken.mint(user1.address, ethers.parseEther("1000"));
            await mockToken.mint(user2.address, ethers.parseEther("1000"));
        });

        it("Should allow users to deposit ERC20 tokens", async function () {
            const depositAmount = ethers.parseEther("100");
            
            await mockToken.connect(user1).approve(gasFeeManager.address, depositAmount);
            await gasFeeManager.connect(user1).depositTokens(mockToken.address, depositAmount);
            
            const balance = await gasFeeManager.getUserBalance(user1.address, mockToken.address);
            expect(balance).to.equal(depositAmount);
        });

        it("Should allow users to withdraw ERC20 tokens", async function () {
            const depositAmount = ethers.parseEther("100");
            const withdrawAmount = ethers.parseEther("50");
            
            await mockToken.connect(user1).approve(gasFeeManager.address, depositAmount);
            await gasFeeManager.connect(user1).depositTokens(mockToken.address, depositAmount);
            await gasFeeManager.connect(user1).withdrawTokens(mockToken.address, withdrawAmount);
            
            const balance = await gasFeeManager.getUserBalance(user1.address, mockToken.address);
            expect(balance).to.equal(depositAmount - withdrawAmount);
        });

        it("Should reject ERC20 deposits with invalid token address", async function () {
            const depositAmount = ethers.parseEther("100");
            
            await expect(
                gasFeeManager.connect(user1).depositTokens(ethers.ZeroAddress, depositAmount)
            ).to.be.revertedWith("Invalid token address");
        });
    });

    describe("Transaction Request and Execution", function () {
        let mockTarget;

        beforeEach(async function () {
            // Deploy a mock target contract for testing
            const MockTarget = await ethers.getContractFactory("MockTarget");
            mockTarget = await MockTarget.deploy();

            // Deposit native tokens for gas fees
            const depositAmount = ethers.parseEther("1.0");
            await gasFeeManager.connect(user1).depositNative({ value: depositAmount });
        });

        it("Should allow users to request transactions", async function () {
            const gasLimit = 100000;
            const maxFeePerGas = ethers.parseUnits("20", "gwei");
            const maxPriorityFeePerGas = ethers.parseUnits("2", "gwei");
            const tokenAmount = BigInt(gasLimit) * maxFeePerGas;
            const data = "0x12345678";

            const tx = await gasFeeManager.connect(user1).requestTransaction(
                mockTarget.address,
                0,
                data,
                gasLimit,
                maxFeePerGas,
                maxPriorityFeePerGas,
                ethers.ZeroAddress,
                tokenAmount
            );

            const receipt = await tx.wait();
            const event = receipt.events.find(e => e.event === "TransactionRequested");
            expect(event).to.not.be.undefined;
            expect(event.args.user).to.equal(user1.address);
            expect(event.args.target).to.equal(mockTarget.address);
        });

        it("Should allow gas providers to execute transactions", async function () {
            const gasLimit = 100000;
            const maxFeePerGas = ethers.parseUnits("20", "gwei");
            const maxPriorityFeePerGas = ethers.parseUnits("2", "gwei");
            const tokenAmount = BigInt(gasLimit) * maxFeePerGas;
            const data = "0x12345678";

            // Request transaction
            const requestTx = await gasFeeManager.connect(user1).requestTransaction(
                mockTarget.address,
                0,
                data,
                gasLimit,
                maxFeePerGas,
                maxPriorityFeePerGas,
                ethers.ZeroAddress,
                tokenAmount
            );

            const requestReceipt = await requestTx.wait();
            const requestEvent = requestReceipt.events.find(e => e.event === "TransactionRequested");
            const requestId = requestEvent.args.requestId;

            // Execute transaction
            const executeTx = await gasFeeManager.connect(gasProvider).executeTransaction(requestId);
            const executeReceipt = await executeTx.wait();
            const executeEvent = executeReceipt.events.find(e => e.event === "TransactionExecuted");
            
            expect(executeEvent).to.not.be.undefined;
            expect(executeEvent.args.success).to.be.true;
        });

        it("Should reject transaction requests with insufficient balance", async function () {
            const gasLimit = 100000;
            const maxFeePerGas = ethers.parseUnits("20", "gwei");
            const maxPriorityFeePerGas = ethers.parseUnits("2", "gwei");
            const tokenAmount = BigInt(gasLimit) * maxFeePerGas;
            const data = "0x12345678";

            await expect(
                gasFeeManager.connect(user2).requestTransaction(
                    mockTarget.address,
                    0,
                    data,
                    gasLimit,
                    maxFeePerGas,
                    maxPriorityFeePerGas,
                    ethers.ZeroAddress,
                    tokenAmount
                )
            ).to.be.revertedWith("Insufficient native balance");
        });

        it("Should reject transaction execution by non-gas providers", async function () {
            const gasLimit = 100000;
            const maxFeePerGas = ethers.parseUnits("20", "gwei");
            const maxPriorityFeePerGas = ethers.parseUnits("2", "gwei");
            const tokenAmount = BigInt(gasLimit) * maxFeePerGas;
            const data = "0x12345678";

            // Request transaction
            const requestTx = await gasFeeManager.connect(user1).requestTransaction(
                mockTarget.address,
                0,
                data,
                gasLimit,
                maxFeePerGas,
                maxPriorityFeePerGas,
                ethers.ZeroAddress,
                tokenAmount
            );

            const requestReceipt = await requestTx.wait();
            const requestEvent = requestReceipt.events.find(e => e.event === "TransactionRequested");
            const requestId = requestEvent.args.requestId;

            // Try to execute with non-gas provider
            await expect(
                gasFeeManager.connect(user2).executeTransaction(requestId)
            ).to.be.reverted;
        });

        it("Should reject duplicate transaction execution", async function () {
            const gasLimit = 100000;
            const maxFeePerGas = ethers.parseUnits("20", "gwei");
            const maxPriorityFeePerGas = ethers.parseUnits("2", "gwei");
            const tokenAmount = BigInt(gasLimit) * maxFeePerGas;
            const data = "0x12345678";

            // Request transaction
            const requestTx = await gasFeeManager.connect(user1).requestTransaction(
                mockTarget.address,
                0,
                data,
                gasLimit,
                maxFeePerGas,
                maxPriorityFeePerGas,
                ethers.ZeroAddress,
                tokenAmount
            );

            const requestReceipt = await requestTx.wait();
            const requestEvent = requestReceipt.events.find(e => e.event === "TransactionRequested");
            const requestId = requestEvent.args.requestId;

            // Execute transaction
            await gasFeeManager.connect(gasProvider).executeTransaction(requestId);

            // Try to execute again
            await expect(
                gasFeeManager.connect(gasProvider).executeTransaction(requestId)
            ).to.be.revertedWith("Transaction already executed");
        });
    });

    describe("Fee Management", function () {
        it("Should collect platform fees correctly", async function () {
            const depositAmount = ethers.parseEther("1.0");
            await gasFeeManager.connect(user1).depositNative({ value: depositAmount });

            const gasLimit = 100000;
            const maxFeePerGas = ethers.parseUnits("20", "gwei");
            const tokenAmount = BigInt(gasLimit) * maxFeePerGas;

            // Request and execute transaction
            const requestTx = await gasFeeManager.connect(user1).requestTransaction(
                user2.address,
                0,
                "0x",
                gasLimit,
                maxFeePerGas,
                maxFeePerGas,
                ethers.ZeroAddress,
                tokenAmount
            );

            const requestReceipt = await requestTx.wait();
            const requestEvent = requestReceipt.events.find(e => e.event === "TransactionRequested");
            const requestId = requestEvent.args.requestId;

            const initialBalance = await ethers.provider.getBalance(feeCollector.address);
            await gasFeeManager.connect(gasProvider).executeTransaction(requestId);
            const finalBalance = await ethers.provider.getBalance(feeCollector.address);

            expect(finalBalance.gt(initialBalance)).to.be.true;
        });

        it("Should collect gas provider fees correctly", async function () {
            const depositAmount = ethers.parseEther("1.0");
            await gasFeeManager.connect(user1).depositNative({ value: depositAmount });

            const gasLimit = 100000;
            const maxFeePerGas = ethers.parseUnits("20", "gwei");
            const tokenAmount = BigInt(gasLimit) * maxFeePerGas;

            // Request and execute transaction
            const requestTx = await gasFeeManager.connect(user1).requestTransaction(
                user2.address,
                0,
                "0x",
                gasLimit,
                maxFeePerGas,
                maxFeePerGas,
                ethers.ZeroAddress,
                tokenAmount
            );

            const requestReceipt = await requestTx.wait();
            const requestEvent = requestReceipt.events.find(e => e.event === "TransactionRequested");
            const requestId = requestEvent.args.requestId;

            const initialBalance = await ethers.provider.getBalance(gasProvider.address);
            await gasFeeManager.connect(gasProvider).executeTransaction(requestId);
            const finalBalance = await ethers.provider.getBalance(gasProvider.address);

            expect(finalBalance.gt(initialBalance)).to.be.true;
        });
    });

    describe("Admin Functions", function () {
        it("Should allow admin to update gas configuration", async function () {
            const newBaseGasPrice = ethers.parseUnits("30", "gwei");
            const newMaxGasPrice = ethers.parseUnits("150", "gwei");
            const newGasLimit = 500000;
            const newPriorityFee = ethers.parseUnits("3", "gwei");

            await gasFeeManager.connect(owner).updateGasConfig(
                SEPOLIA_CHAIN_ID,
                newBaseGasPrice,
                newMaxGasPrice,
                newGasLimit,
                newPriorityFee,
                true
            );

            const config = await gasFeeManager.getGasConfig(SEPOLIA_CHAIN_ID);
            expect(config.baseGasPrice).to.equal(newBaseGasPrice);
            expect(config.maxGasPrice).to.equal(newMaxGasPrice);
            expect(config.gasLimit).to.equal(newGasLimit);
            expect(config.priorityFee).to.equal(newPriorityFee);
        });

        it("Should allow admin to update fee percentages", async function () {
            const newPlatformFee = 75; // 0.75%
            const newGasProviderFee = 125; // 1.25%

            await gasFeeManager.connect(owner).updateFeePercentages(newPlatformFee, newGasProviderFee);

            expect(await gasFeeManager.platformFeePercentage()).to.equal(newPlatformFee);
            expect(await gasFeeManager.gasProviderFeePercentage()).to.equal(newGasProviderFee);
        });

        it("Should reject fee updates from non-admin", async function () {
            await expect(
                gasFeeManager.connect(user1).updateFeePercentages(75, 125)
            ).to.be.reverted;
        });

        it("Should allow admin to pause and unpause contract", async function () {
            await gasFeeManager.connect(owner).pause();
            expect(await gasFeeManager.paused()).to.be.true;

            await gasFeeManager.connect(owner).unpause();
            expect(await gasFeeManager.paused()).to.be.false;
        });

        it("Should reject deposits when paused", async function () {
            await gasFeeManager.connect(owner).pause();
            
            await expect(
                gasFeeManager.connect(user1).depositNative({ value: ethers.parseEther("1.0") })
            ).to.be.revertedWith("Pausable: paused");
        });
    });

    describe("Utility Functions", function () {
        it("Should estimate gas cost correctly", async function () {
            const gasLimit = 100000;
            const maxFeePerGas = ethers.parseUnits("20", "gwei");
            const expectedCost = BigInt(gasLimit) * maxFeePerGas;

            const estimatedCost = await gasFeeManager.estimateGasCost(gasLimit, maxFeePerGas);
            expect(estimatedCost).to.equal(expectedCost);
        });

        it("Should return correct contract balance", async function () {
            const depositAmount = ethers.parseEther("1.0");
            await gasFeeManager.connect(user1).depositNative({ value: depositAmount });

            const contractBalance = await gasFeeManager.getContractBalance(ethers.ZeroAddress);
            expect(contractBalance).to.equal(depositAmount);
        });

        it("Should return correct user balance", async function () {
            const depositAmount = ethers.parseEther("1.0");
            await gasFeeManager.connect(user1).depositNative({ value: depositAmount });

            const userBalance = await gasFeeManager.getUserBalance(user1.address, ethers.ZeroAddress);
            expect(userBalance).to.equal(depositAmount);
        });
    });

    describe("Network-Specific Behavior", function () {
        it("Should handle Alkebuleum network configuration", async function () {
            const config = await gasFeeManager.getGasConfig(ALKEBULEUM_CHAIN_ID);
            expect(config.baseGasPrice).to.equal(ethers.parseUnits("1", "gwei"));
            expect(config.maxGasPrice).to.equal(ethers.parseUnits("50", "gwei"));
            expect(config.isActive).to.be.true;
        });

        it("Should handle Sepolia network configuration", async function () {
            const config = await gasFeeManager.getGasConfig(SEPOLIA_CHAIN_ID);
            expect(config.baseGasPrice).to.equal(ethers.parseUnits("20", "gwei"));
            expect(config.maxGasPrice).to.equal(ethers.parseUnits("100", "gwei"));
            expect(config.isActive).to.be.true;
        });
    });
});

// Mock contracts for testing
describe("Mock Contracts", function () {
    let owner;

    beforeEach(async function () {
        [owner] = await ethers.getSigners();
    });

    it("Should deploy mock ERC20 token", async function () {
        const MockToken = await ethers.getContractFactory("MockERC20");
        const mockToken = await MockToken.deploy("Mock Token", "MTK", owner.address);

        expect(await mockToken.name()).to.equal("Mock Token");
        expect(await mockToken.symbol()).to.equal("MTK");
    });

    it("Should deploy mock target contract", async function () {
        const MockTarget = await ethers.getContractFactory("MockTarget");
        const mockTarget = await MockTarget.deploy();

        expect(mockTarget.address).to.not.equal(ethers.ZeroAddress);
    });
});
