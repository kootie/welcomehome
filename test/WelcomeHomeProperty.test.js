const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Welcome Home Property System", function () {
    let kycRegistry, propertyFactory, marketplace, ownershipRegistry, propertyTokenImpl;
    let timelockController, propertyGovernance;
    let owner, user1, user2, user3, kycVerifier;
    let propertyToken1, propertyToken2;

    beforeEach(async function () {
        [owner, user1, user2, user3, kycVerifier] = await ethers.getSigners();

        // Deploy KYC Registry
        const KYCRegistry = await ethers.getContractFactory("KYCRegistry");
        kycRegistry = await KYCRegistry.deploy();

        // Deploy PropertyToken implementation
        const PropertyToken = await ethers.getContractFactory("PropertyToken");
        propertyTokenImpl = await PropertyToken.deploy(
            "WelcomeHomeProperty",
            "WH",
            1000000 * 10**18, // 1M tokens
            kycRegistry.address,
            owner.address
        );

        // Deploy PropertyFactory
        const PropertyFactory = await ethers.getContractFactory("PropertyFactory");
        propertyFactory = await PropertyFactory.deploy(
            propertyTokenImpl.address,
            kycRegistry.address,
            owner.address
        );

        // Deploy Marketplace
        const Marketplace = await ethers.getContractFactory("Marketplace");
        marketplace = await Marketplace.deploy(
            kycRegistry.address,
            owner.address,
            250 // 2.5% fee
        );

        // Deploy OwnershipRegistry
        const OwnershipRegistry = await ethers.getContractFactory("OwnershipRegistry");
        ownershipRegistry = await OwnershipRegistry.deploy(
            kycRegistry.address,
            owner.address
        );

        // Deploy TimelockController
        const PropertyTimelockController = await ethers.getContractFactory("PropertyTimelockController");
        timelockController = await PropertyTimelockController.deploy(
            24 * 60 * 60, // 24 hours
            [propertyFactory.address],
            [propertyFactory.address],
            owner.address
        );

        // Deploy PropertyGovernance
        const PropertyGovernance = await ethers.getContractFactory("PropertyGovernance");
        propertyGovernance = await PropertyGovernance.deploy(
            propertyTokenImpl.address,
            timelockController.address,
            owner.address
        );

        // Setup roles
        await kycRegistry.grantRole(kycRegistry.KYC_VERIFIER_ROLE(), kycVerifier.address);
        await kycRegistry.grantRole(kycRegistry.MARKETPLACE_ROLE(), marketplace.address);
        await kycRegistry.grantRole(kycRegistry.FACTORY_ROLE(), propertyFactory.address);
        await kycRegistry.grantRole(kycRegistry.REGISTRY_ROLE(), ownershipRegistry.address);
        await kycRegistry.grantRole(kycRegistry.GOVERNANCE_ROLE(), propertyGovernance.address);

        // Grant timelock roles to governance
        await timelockController.grantRole(await timelockController.PROPOSER_ROLE(), propertyGovernance.address);
        await timelockController.grantRole(await timelockController.EXECUTOR_ROLE(), propertyGovernance.address);

        // Revoke deployer's timelock roles
        await timelockController.revokeRole(await timelockController.PROPOSER_ROLE(), owner.address);
        await timelockController.revokeRole(await timelockController.EXECUTOR_ROLE(), owner.address);
    });

    describe("KYC Registry", function () {
        it("Should allow KYC verifier to verify users", async function () {
            await kycRegistry.connect(kycVerifier).verifyUser(user1.address, "user1@example.com");
            expect(await kycRegistry.isVerified(user1.address)).to.be.true;
        });

        it("Should prevent non-verifiers from verifying users", async function () {
            await expect(
                kycRegistry.connect(user1).verifyUser(user2.address, "user2@example.com")
            ).to.be.revertedWith("AccessControl");
        });

        it("Should allow KYC verifier to revoke verification", async function () {
            await kycRegistry.connect(kycVerifier).verifyUser(user1.address, "user1@example.com");
            await kycRegistry.connect(kycVerifier).revokeVerification(user1.address);
            expect(await kycRegistry.isVerified(user1.address)).to.be.false;
        });
    });

    describe("PropertyToken Implementation", function () {
        it("Should initialize with correct parameters", async function () {
            expect(await propertyTokenImpl.maxTokens()).to.equal(1000000 * 10**18);
            expect(await propertyTokenImpl.kycRegistry()).to.equal(kycRegistry.address);
        });

        it("Should allow property manager to set property details", async function () {
            await propertyTokenImpl.setPropertyDetails(
                "Test Property",
                "123 Test St, Test City",
                500000 * 10**18, // 500k value
                "ipfs://test-metadata"
            );

            expect(await propertyTokenImpl.propertyName()).to.equal("Test Property");
            expect(await propertyTokenImpl.propertyLocation()).to.equal("123 Test St, Test City");
            expect(await propertyTokenImpl.propertyValue()).to.equal(500000 * 10**18);
            expect(await propertyTokenImpl.propertyMetadataURI()).to.equal("ipfs://test-metadata");
        });

        it("Should allow property manager to connect to external property", async function () {
            await propertyTokenImpl.connectToProperty(
                "0x1234567890123456789012345678901234567890",
                "TX123456789"
            );

            expect(await propertyTokenImpl.connectedPropertyContract()).to.equal("0x1234567890123456789012345678901234567890");
            expect(await propertyTokenImpl.transactionID()).to.equal("TX123456789");
        });

        it("Should allow minter to issue tokens to KYC verified users", async function () {
            await kycRegistry.connect(kycVerifier).verifyUser(user1.address, "user1@example.com");
            await propertyTokenImpl.issueTokens(user1.address, 1000 * 10**18);

            expect(await propertyTokenImpl.balanceOf(user1.address)).to.equal(1000 * 10**18);
            expect(await propertyTokenImpl.totalTokensIssued()).to.equal(1000 * 10**18);
        });

        it("Should prevent issuing tokens to non-KYC users", async function () {
            await expect(
                propertyTokenImpl.issueTokens(user1.address, 1000 * 10**18)
            ).to.be.revertedWith("Recipient must be KYC verified");
        });

        it("Should enforce max tokens cap", async function () {
            await kycRegistry.connect(kycVerifier).verifyUser(user1.address, "user1@example.com");
            
            // Try to issue more than max tokens
            await expect(
                propertyTokenImpl.issueTokens(user1.address, 1000001 * 10**18)
            ).to.be.revertedWith("Exceeds max tokens cap");
        });

        it("Should support ERC20Permit for gasless approvals", async function () {
            const deadline = (await time.latest()) + 3600; // 1 hour from now
            
            const signature = await user1._signTypedData(
                {
                    name: await propertyTokenImpl.name(),
                    version: "1",
                    chainId: await ethers.provider.getNetwork().then(n => n.chainId),
                    verifyingContract: propertyTokenImpl.address
                },
                {
                    Permit: [
                        { name: "owner", type: "address" },
                        { name: "spender", type: "address" },
                        { name: "value", type: "uint256" },
                        { name: "nonce", type: "uint256" },
                        { name: "deadline", type: "uint256" }
                    ]
                },
                {
                    owner: user1.address,
                    spender: user2.address,
                    value: 1000 * 10**18,
                    nonce: await propertyTokenImpl.nonces(user1.address),
                    deadline: deadline
                }
            );

            const { v, r, s } = ethers.utils.splitSignature(signature);
            
            await propertyTokenImpl.connect(user2).permit(
                user1.address,
                user2.address,
                1000 * 10**18,
                deadline,
                v,
                r,
                s
            );

            expect(await propertyTokenImpl.allowance(user1.address, user2.address)).to.equal(1000 * 10**18);
        });

        it("Should support ERC20Votes for governance", async function () {
            await kycRegistry.connect(kycVerifier).verifyUser(user1.address, "user1@example.com");
            await propertyTokenImpl.issueTokens(user1.address, 1000 * 10**18);

            // Delegate voting power to self
            await propertyTokenImpl.connect(user1).delegate(user1.address);
            
            expect(await propertyTokenImpl.getVotes(user1.address)).to.equal(1000 * 10**18);
        });

        it("Should allow admin to recover ERC20 tokens", async function () {
            // Send some tokens to the contract
            await kycRegistry.connect(kycVerifier).verifyUser(user1.address, "user1@example.com");
            await propertyTokenImpl.issueTokens(user1.address, 1000 * 10**18);
            await propertyTokenImpl.connect(user1).transfer(propertyTokenImpl.address, 100 * 10**18);

            const balanceBefore = await propertyTokenImpl.balanceOf(owner.address);
            await propertyTokenImpl.recoverERC20(propertyTokenImpl.address, 100 * 10**18);
            const balanceAfter = await propertyTokenImpl.balanceOf(owner.address);

            expect(balanceAfter.sub(balanceBefore)).to.equal(100 * 10**18);
        });
    });

    describe("PropertyFactory", function () {
        it("Should create new property tokens", async function () {
            const tx = await propertyFactory.createProperty(
                "Test Property",
                "TEST",
                1000000 * 10**18, // maxTokens
                100 * 10**18, // tokenPrice
                "ipfs://test-metadata",
                "123 Test St, Test City",
                500000 * 10**18, // propertyValue
                "TX123456789"
            );

            const receipt = await tx.wait();
            const event = receipt.events.find(e => e.event === "PropertyCreated");
            
            expect(event.args.name).to.equal("Test Property");
            expect(event.args.symbol).to.equal("TEST");
            expect(event.args.maxTokens).to.equal(1000000 * 10**18);
            expect(event.args.tokenPrice).to.equal(100 * 10**18);
        });

        it("Should track created properties", async function () {
            await propertyFactory.createProperty(
                "Test Property 1",
                "TEST1",
                1000000 * 10**18,
                100 * 10**18,
                "ipfs://test1-metadata",
                "123 Test St, Test City",
                500000 * 10**18,
                "TX123456789"
            );

            await propertyFactory.createProperty(
                "Test Property 2",
                "TEST2",
                500000 * 10**18,
                200 * 10**18,
                "ipfs://test2-metadata",
                "456 Test Ave, Test City",
                300000 * 10**18,
                "TX987654321"
            );

            expect(await propertyFactory.propertyCount()).to.equal(2);
            
            const property1 = await propertyFactory.getProperty(1);
            expect(property1.name).to.equal("Test Property 1");
            
            const property2 = await propertyFactory.getProperty(2);
            expect(property2.name).to.equal("Test Property 2");
        });

        it("Should allow property creators to update metadata", async function () {
            await propertyFactory.createProperty(
                "Test Property",
                "TEST",
                1000000 * 10**18,
                100 * 10**18,
                "ipfs://test-metadata",
                "123 Test St, Test City",
                500000 * 10**18,
                "TX123456789"
            );

            await propertyFactory.updatePropertyMetadata(1, "ipfs://updated-metadata");
            
            const property = await propertyFactory.getProperty(1);
            expect(property.metadataURI).to.equal("ipfs://updated-metadata");
        });

        it("Should allow property creators to deactivate properties", async function () {
            await propertyFactory.createProperty(
                "Test Property",
                "TEST",
                1000000 * 10**18,
                100 * 10**18,
                "ipfs://test-metadata",
                "123 Test St, Test City",
                500000 * 10**18,
                "TX123456789"
            );

            await propertyFactory.deactivateProperty(1);
            
            const property = await propertyFactory.getProperty(1);
            expect(property.isActive).to.be.false;
        });
    });

    describe("Marketplace", function () {
        beforeEach(async function () {
            // Create a property and issue tokens
            await propertyFactory.createProperty(
                "Test Property",
                "TEST",
                1000000 * 10**18,
                100 * 10**18,
                "ipfs://test-metadata",
                "123 Test St, Test City",
                500000 * 10**18,
                "TX123456789"
            );

            const property = await propertyFactory.getProperty(1);
            propertyToken1 = await ethers.getContractAt("PropertyToken", property.tokenAddress);

            // Verify users and issue tokens
            await kycRegistry.connect(kycVerifier).verifyUser(user1.address, "user1@example.com");
            await kycRegistry.connect(kycVerifier).verifyUser(user2.address, "user2@example.com");
            await propertyToken1.issueTokens(user1.address, 1000 * 10**18);
        });

        it("Should allow users to list tokens for sale", async function () {
            await propertyToken1.connect(user1).approve(marketplace.address, 100 * 10**18);
            
            await marketplace.connect(user1).listTokens(
                propertyToken1.address,
                100 * 10**18,
                120 * 10**18 // 20% markup
            );

            const listing = await marketplace.getListing(propertyToken1.address, user1.address);
            expect(listing.amount).to.equal(100 * 10**18);
            expect(listing.price).to.equal(120 * 10**18);
        });

        it("Should allow users to purchase listed tokens", async function () {
            await propertyToken1.connect(user1).approve(marketplace.address, 100 * 10**18);
            
            await marketplace.connect(user1).listTokens(
                propertyToken1.address,
                100 * 10**18,
                120 * 10**18
            );

            const balanceBefore = await propertyToken1.balanceOf(user2.address);
            
            await marketplace.connect(user2).purchaseTokens(
                propertyToken1.address,
                user1.address,
                100 * 10**18,
                { value: 120 * 10**18 }
            );

            const balanceAfter = await propertyToken1.balanceOf(user2.address);
            expect(balanceAfter.sub(balanceBefore)).to.equal(100 * 10**18);
        });

        it("Should collect platform fees", async function () {
            await propertyToken1.connect(user1).approve(marketplace.address, 100 * 10**18);
            
            await marketplace.connect(user1).listTokens(
                propertyToken1.address,
                100 * 10**18,
                120 * 10**18
            );

            const feeCollectorBalanceBefore = await ethers.provider.getBalance(owner.address);
            
            await marketplace.connect(user2).purchaseTokens(
                propertyToken1.address,
                user1.address,
                100 * 10**18,
                { value: 120 * 10**18 }
            );

            const feeCollectorBalanceAfter = await ethers.provider.getBalance(owner.address);
            const expectedFee = (120 * 10**18 * 250) / 10000; // 2.5% of 120 tokens
            
            expect(feeCollectorBalanceAfter.gt(feeCollectorBalanceBefore)).to.be.true;
        });
    });

    describe("OwnershipRegistry", function () {
        it("Should track token ownership", async function () {
            // Create property and issue tokens
            await propertyFactory.createProperty(
                "Test Property",
                "TEST",
                1000000 * 10**18,
                100 * 10**18,
                "ipfs://test-metadata",
                "123 Test St, Test City",
                500000 * 10**18,
                "TX123456789"
            );

            const property = await propertyFactory.getProperty(1);
            propertyToken1 = await ethers.getContractAt("PropertyToken", property.tokenAddress);

            await kycRegistry.connect(kycVerifier).verifyUser(user1.address, "user1@example.com");
            await propertyToken1.issueTokens(user1.address, 1000 * 10**18);

            // Register ownership
            await ownershipRegistry.registerTokenOwnership(
                propertyToken1.address,
                user1.address,
                1000 * 10**18
            );

            const holdings = await ownershipRegistry.getUserHoldings(user1.address);
            expect(holdings.length).to.equal(1);
            expect(holdings[0].tokenAddress).to.equal(propertyToken1.address);
            expect(holdings[0].amount).to.equal(1000 * 10**18);
        });

        it("Should track transfer history", async function () {
            // Create property and issue tokens
            await propertyFactory.createProperty(
                "Test Property",
                "TEST",
                1000000 * 10**18,
                100 * 10**18,
                "ipfs://test-metadata",
                "123 Test St, Test City",
                500000 * 10**18,
                "TX123456789"
            );

            const property = await propertyFactory.getProperty(1);
            propertyToken1 = await ethers.getContractAt("PropertyToken", property.tokenAddress);

            await kycRegistry.connect(kycVerifier).verifyUser(user1.address, "user1@example.com");
            await kycRegistry.connect(kycVerifier).verifyUser(user2.address, "user2@example.com");
            await propertyToken1.issueTokens(user1.address, 1000 * 10**18);

            // Register initial ownership
            await ownershipRegistry.registerTokenOwnership(
                propertyToken1.address,
                user1.address,
                1000 * 10**18
            );

            // Transfer tokens
            await propertyToken1.connect(user1).transfer(user2.address, 500 * 10**18);

            // Register transfer
            await ownershipRegistry.registerTokenTransfer(
                propertyToken1.address,
                user1.address,
                user2.address,
                500 * 10**18
            );

            const transfers = await ownershipRegistry.getTransferHistory(propertyToken1.address);
            expect(transfers.length).to.equal(1);
            expect(transfers[0].from).to.equal(user1.address);
            expect(transfers[0].to).to.equal(user2.address);
            expect(transfers[0].amount).to.equal(500 * 10**18);
        });
    });

    describe("PropertyGovernance", function () {
        beforeEach(async function () {
            // Issue tokens to users for governance
            await kycRegistry.connect(kycVerifier).verifyUser(user1.address, "user1@example.com");
            await kycRegistry.connect(kycVerifier).verifyUser(user2.address, "user2@example.com");
            await propertyTokenImpl.issueTokens(user1.address, 10000 * 10**18);
            await propertyTokenImpl.issueTokens(user2.address, 5000 * 10**18);

            // Delegate voting power
            await propertyTokenImpl.connect(user1).delegate(user1.address);
            await propertyTokenImpl.connect(user2).delegate(user2.address);
        });

        it("Should allow token holders to create proposals", async function () {
            const targets = [propertyTokenImpl.address];
            const values = [0];
            const signatures = ["setTokenPrice(uint256)"];
            const calldatas = [ethers.utils.defaultAbiCoder.encode(["uint256"], [150 * 10**18])];
            const description = "Update token price to 150";

            const proposalId = await propertyGovernance.connect(user1).propose(
                targets,
                values,
                signatures,
                calldatas,
                description
            );

            expect(proposalId).to.equal(0);
            
            const proposalDescription = await propertyGovernance.getProposalDescription(0);
            expect(proposalDescription).to.equal(description);
        });

        it("Should enforce proposal threshold", async function () {
            // Issue small amount to user3
            await kycRegistry.connect(kycVerifier).verifyUser(user3.address, "user3@example.com");
            await propertyTokenImpl.issueTokens(user3.address, 100 * 10**18);
            await propertyTokenImpl.connect(user3).delegate(user3.address);

            const targets = [propertyTokenImpl.address];
            const values = [0];
            const signatures = ["setTokenPrice(uint256)"];
            const calldatas = [ethers.utils.defaultAbiCoder.encode(["uint256"], [150 * 10**18])];
            const description = "Update token price to 150";

            // Should fail due to insufficient voting power
            await expect(
                propertyGovernance.connect(user3).propose(
                    targets,
                    values,
                    signatures,
                    calldatas,
                    description
                )
            ).to.be.revertedWith("Insufficient voting power or not proposer");
        });

        it("Should allow voting on proposals", async function () {
            const targets = [propertyTokenImpl.address];
            const values = [0];
            const signatures = ["setTokenPrice(uint256)"];
            const calldatas = [ethers.utils.defaultAbiCoder.encode(["uint256"], [150 * 10**18])];
            const description = "Update token price to 150";

            await propertyGovernance.connect(user1).propose(
                targets,
                values,
                signatures,
                calldatas,
                description
            );

            // Vote for the proposal
            await propertyGovernance.connect(user1).castVote(0, 1); // For
            await propertyGovernance.connect(user2).castVote(0, 1); // For

            const proposalState = await propertyGovernance.state(0);
            expect(proposalState).to.equal(1); // Active
        });

        it("Should allow proposal execution after timelock", async function () {
            const targets = [propertyTokenImpl.address];
            const values = [0];
            const signatures = ["setTokenPrice(uint256)"];
            const calldatas = [ethers.utils.defaultAbiCoder.encode(["uint256"], [150 * 10**18])];
            const description = "Update token price to 150";

            await propertyGovernance.connect(user1).propose(
                targets,
                values,
                signatures,
                calldatas,
                description
            );

            // Vote for the proposal
            await propertyGovernance.connect(user1).castVote(0, 1);
            await propertyGovernance.connect(user2).castVote(0, 1);

            // Fast forward time to end voting period
            await time.increase(2 * 24 * 60 * 60); // 2 days

            // Queue the proposal
            await propertyGovernance.connect(user1).queue(
                targets,
                values,
                signatures,
                calldatas,
                ethers.utils.keccak256(ethers.utils.toUtf8Bytes(description))
            );

            // Fast forward past timelock delay
            await time.increase(25 * 60 * 60); // 25 hours

            // Execute the proposal
            await propertyGovernance.connect(user1).execute(
                targets,
                values,
                signatures,
                calldatas,
                ethers.utils.keccak256(ethers.utils.toUtf8Bytes(description))
            );

            const proposalState = await propertyGovernance.state(0);
            expect(proposalState).to.equal(7); // Executed

            const isExecuted = await propertyGovernance.isProposalExecuted(0);
            expect(isExecuted).to.be.true;
        });

        it("Should allow admin to update governance parameters", async function () {
            const newProposalThreshold = 2000 * 10**18;
            const newVotingDelay = 2 * 24 * 60 * 60; // 2 days
            const newVotingPeriod = 5 * 24 * 60 * 60; // 5 days
            const newQuorumPercentage = 5; // 5%

            await propertyGovernance.updateGovernanceParameters(
                newProposalThreshold,
                newVotingDelay,
                newVotingPeriod,
                newQuorumPercentage
            );

            expect(await propertyGovernance.proposalThreshold()).to.equal(newProposalThreshold);
            expect(await propertyGovernance.votingDelay()).to.equal(newVotingDelay);
            expect(await propertyGovernance.votingPeriod()).to.equal(newVotingPeriod);
        });
    });

    describe("Integration Tests", function () {
        it("Should handle complete property lifecycle with governance", async function () {
            // 1. Create property
            await propertyFactory.createProperty(
                "Governance Test Property",
                "GOV",
                1000000 * 10**18,
                100 * 10**18,
                "ipfs://governance-metadata",
                "789 Governance St, Test City",
                1000000 * 10**18,
                "TXGOV123456"
            );

            const property = await propertyFactory.getProperty(1);
            propertyToken1 = await ethers.getContractAt("PropertyToken", property.tokenAddress);

            // 2. Issue tokens to users
            await kycRegistry.connect(kycVerifier).verifyUser(user1.address, "user1@example.com");
            await kycRegistry.connect(kycVerifier).verifyUser(user2.address, "user2@example.com");
            await propertyToken1.issueTokens(user1.address, 5000 * 10**18);
            await propertyToken1.issueTokens(user2.address, 3000 * 10**18);

            // 3. Delegate voting power
            await propertyToken1.connect(user1).delegate(user1.address);
            await propertyToken1.connect(user2).delegate(user2.address);

            // 4. Create governance proposal
            const targets = [propertyToken1.address];
            const values = [0];
            const signatures = ["setTokenPrice(uint256)"];
            const calldatas = [ethers.utils.defaultAbiCoder.encode(["uint256"], [150 * 10**18])];
            const description = "Increase token price to 150";

            await propertyGovernance.connect(user1).propose(
                targets,
                values,
                signatures,
                calldatas,
                description
            );

            // 5. Vote on proposal
            await propertyGovernance.connect(user1).castVote(0, 1);
            await propertyGovernance.connect(user2).castVote(0, 1);

            // 6. List tokens on marketplace
            await propertyToken1.connect(user1).approve(marketplace.address, 1000 * 10**18);
            await marketplace.connect(user1).listTokens(
                propertyToken1.address,
                1000 * 10**18,
                120 * 10**18
            );

            // 7. Purchase tokens
            await marketplace.connect(user2).purchaseTokens(
                propertyToken1.address,
                user1.address,
                1000 * 10**18,
                { value: 120 * 10**18 }
            );

            // 8. Register ownership
            await ownershipRegistry.registerTokenOwnership(
                propertyToken1.address,
                user2.address,
                1000 * 10**18
            );

            // Verify final state
            expect(await propertyToken1.balanceOf(user2.address)).to.equal(4000 * 10**18);
            expect(await marketplace.getListing(propertyToken1.address, user1.address)).to.deep.equal([
                ethers.constants.AddressZero,
                0,
                0,
                false
            ]);

            const holdings = await ownershipRegistry.getUserHoldings(user2.address);
            expect(holdings.length).to.equal(1);
            expect(holdings[0].amount).to.equal(1000 * 10**18);
        });
    });
});
