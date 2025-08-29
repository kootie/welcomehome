// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title PropertyGovernance
 * @dev Simplified governance system for property token holders
 */
contract PropertyGovernance is AccessControl, Pausable, ReentrancyGuard {
    // Roles
    bytes32 public constant GOVERNANCE_ADMIN_ROLE = keccak256("GOVERNANCE_ADMIN_ROLE");
    bytes32 public constant PROPOSAL_CREATOR_ROLE = keccak256("PROPOSAL_CREATOR_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    // Governance token
    IERC20 public governanceToken;
    
    // Governance parameters
    uint256 public proposalThreshold;
    uint256 public votingDelay;
    uint256 public votingPeriod;
    uint256 public quorumPercentage;
    uint256 public timelockDelay;

    // Proposal states
    enum ProposalState { Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed }
    
    // Vote options
    enum VoteType { Against, For, Abstain }

    // Proposal structure
    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        address[] targets;
        uint256[] values;
        string[] signatures;
        bytes[] calldatas;
        uint256 startTime;
        uint256 endTime;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        bool canceled;
        bool executed;
        mapping(address => Receipt) receipts;
    }

    // Vote receipt
    struct Receipt {
        bool hasVoted;
        bool support;
        uint256 votes;
    }

    // State variables
    uint256 private _proposalCounter;
    mapping(uint256 => Proposal) public proposals;
    mapping(address => uint256) public latestProposalIds;

    // Events
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string description,
        address[] targets,
        uint256[] values,
        string[] signatures,
        bytes[] calldatas
    );
    
    event VoteCast(
        address indexed voter,
        uint256 indexed proposalId,
        VoteType support,
        uint256 votes
    );
    
    event ProposalCanceled(uint256 indexed proposalId);
    event ProposalExecuted(uint256 indexed proposalId);
    event EmergencyAction(string action, address indexed actor, uint256 timestamp);

    // Errors
    error ProposalNotFound();
    error ProposalAlreadyExecuted();
    error ProposalNotActive();
    error InsufficientVotingPower();
    error AlreadyVoted();
    error QuorumNotMet();
    error UnauthorizedOperation();

    /**
     * @dev Constructor
     * @param _governanceToken Address of the governance token
     * @param _proposalThreshold Minimum tokens required to create a proposal
     * @param _votingDelay Delay before voting starts
     * @param _votingPeriod Duration of voting period
     * @param _quorumPercentage Minimum percentage of total supply required for quorum
     * @param _timelockDelay Delay before proposal can be executed
     */
    constructor(
        address _governanceToken,
        uint256 _proposalThreshold,
        uint256 _votingDelay,
        uint256 _votingPeriod,
        uint256 _quorumPercentage,
        uint256 _timelockDelay
    ) {
        if (_governanceToken == address(0)) revert("Token address cannot be zero");
        if (_quorumPercentage > 100) revert("Quorum percentage cannot exceed 100");
        
        governanceToken = IERC20(_governanceToken);
        proposalThreshold = _proposalThreshold;
        votingDelay = _votingDelay;
        votingPeriod = _votingPeriod;
        quorumPercentage = _quorumPercentage;
        timelockDelay = _timelockDelay;
        
        // Set up roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GOVERNANCE_ADMIN_ROLE, msg.sender);
        _grantRole(PROPOSAL_CREATOR_ROLE, msg.sender);
        _grantRole(EMERGENCY_ROLE, msg.sender);
    }

    /**
     * @dev Create a new proposal
     */
    function propose(
        address[] memory targets,
        uint256[] memory values,
        string[] memory signatures,
        bytes[] memory calldatas,
        string memory description
    ) 
        external 
        onlyRole(PROPOSAL_CREATOR_ROLE)
        whenNotPaused
        returns (uint256 proposalId)
    {
        if (getPriorVotes(msg.sender, block.number - 1) < proposalThreshold) {
            revert InsufficientVotingPower();
        }
        
        if (targets.length != values.length || targets.length != signatures.length || targets.length != calldatas.length) {
            revert("Proposal function information arity mismatch");
        }
        
        _proposalCounter++;
        proposalId = _proposalCounter;
        
        Proposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.proposer = msg.sender;
        proposal.description = description;
        proposal.targets = targets;
        proposal.values = values;
        proposal.signatures = signatures;
        proposal.calldatas = calldatas;
        proposal.startTime = block.timestamp + votingDelay;
        proposal.endTime = block.timestamp + votingDelay + votingPeriod;
        
        latestProposalIds[msg.sender] = proposalId;
        
        emit ProposalCreated(
            proposalId,
            msg.sender,
            description,
            targets,
            values,
            signatures,
            calldatas
        );
        
        return proposalId;
    }

    /**
     * @dev Cast a vote on a proposal
     */
    function castVote(uint256 proposalId, VoteType support) 
        external 
        whenNotPaused
        returns (uint256)
    {
        Proposal storage proposal = proposals[proposalId];
        if (proposal.id == 0) revert ProposalNotFound();
        if (proposal.canceled) revert ProposalNotActive();
        if (block.timestamp < proposal.startTime || block.timestamp > proposal.endTime) {
            revert ProposalNotActive();
        }
        
        address voter = msg.sender;
        Receipt storage receipt = proposal.receipts[voter];
        if (receipt.hasVoted) revert AlreadyVoted();
        
        uint256 votes = getPriorVotes(voter, proposal.startTime);
        if (votes == 0) revert InsufficientVotingPower();
        
        receipt.hasVoted = true;
        receipt.support = support == VoteType.For;
        receipt.votes = votes;
        
        if (support == VoteType.For) {
            proposal.forVotes += votes;
        } else if (support == VoteType.Against) {
            proposal.againstVotes += votes;
        } else if (support == VoteType.Abstain) {
            proposal.abstainVotes += votes;
        }
        
        emit VoteCast(voter, proposalId, support, votes);
        return votes;
    }

    /**
     * @dev Execute a successful proposal
     */
    function execute(uint256 proposalId) 
        external 
        whenNotPaused
        nonReentrant
    {
        Proposal storage proposal = proposals[proposalId];
        if (proposal.id == 0) revert ProposalNotFound();
        if (proposal.executed) revert ProposalAlreadyExecuted();
        if (proposal.canceled) revert ProposalNotActive();
        
        ProposalState proposalState = state(proposalId);
        if (proposalState != ProposalState.Succeeded) revert("Proposal not succeeded");
        
        proposal.executed = true;
        
        for (uint256 i = 0; i < proposal.targets.length; i++) {
            // Execute the call
            (bool success, bytes memory returndata) = proposal.targets[i].call{
                value: proposal.values[i]
            }(proposal.calldatas[i]);
            
            if (!success) {
                if (returndata.length > 0) {
                    assembly {
                        let returndata_size := mload(returndata)
                        revert(add(32, returndata), returndata_size)
                    }
                } else {
                    revert("Proposal execution failed");
                }
            }
        }
        
        emit ProposalExecuted(proposalId);
    }

    /**
     * @dev Cancel a proposal
     */
    function cancel(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        if (proposal.id == 0) revert ProposalNotFound();
        if (proposal.canceled) revert ProposalNotActive();
        
        address proposer = proposal.proposer;
        if (msg.sender != proposer && !hasRole(GOVERNANCE_ADMIN_ROLE, msg.sender)) {
            revert UnauthorizedOperation();
        }
        
        proposal.canceled = true;
        emit ProposalCanceled(proposalId);
    }

    /**
     * @dev Get proposal state
     */
    function state(uint256 proposalId) public view returns (ProposalState) {
        Proposal storage proposal = proposals[proposalId];
        if (proposal.id == 0) revert ProposalNotFound();
        if (proposal.canceled) return ProposalState.Canceled;
        if (proposal.executed) return ProposalState.Executed;
        if (block.timestamp < proposal.startTime) return ProposalState.Pending;
        if (block.timestamp <= proposal.endTime) return ProposalState.Active;
        
        uint256 forVotes = proposal.forVotes;
        uint256 againstVotes = proposal.againstVotes;
        uint256 totalVotes = forVotes + againstVotes + proposal.abstainVotes;
        
        if (totalVotes < quorumVotes()) return ProposalState.Defeated;
        if (forVotes <= againstVotes) return ProposalState.Defeated;
        
        return ProposalState.Succeeded;
    }

    /**
     * @dev Get vote receipt for a voter
     */
    function getReceipt(uint256 proposalId, address voter) external view returns (Receipt memory) {
        return proposals[proposalId].receipts[voter];
    }

    /**
     * @dev Get total number of proposals
     */
    function proposalCount() external view returns (uint256) {
        return _proposalCounter;
    }

    /**
     * @dev Get votes for an account at a specific block
     */
    function getPriorVotes(address account, uint256 blockNumber) public view returns (uint256) {
        return governanceToken.balanceOf(account);
    }

    /**
     * @dev Calculate quorum votes
     */
    function quorumVotes() public view returns (uint256) {
        return (governanceToken.totalSupply() * quorumPercentage) / 100;
    }

    /**
     * @dev Emergency pause
     */
    function emergencyPause() external onlyRole(EMERGENCY_ROLE) {
        _pause();
        emit EmergencyAction("Governance Paused", msg.sender, block.timestamp);
    }

    /**
     * @dev Emergency unpause
     */
    function emergencyUnpause() external onlyRole(EMERGENCY_ROLE) {
        _unpause();
        emit EmergencyAction("Governance Unpaused", msg.sender, block.timestamp);
    }

    /**
     * @dev Update governance parameters
     */
    function updateGovernanceParameters(
        uint256 _proposalThreshold,
        uint256 _votingDelay,
        uint256 _votingPeriod,
        uint256 _quorumPercentage,
        uint256 _timelockDelay
    ) external onlyRole(GOVERNANCE_ADMIN_ROLE) {
        proposalThreshold = _proposalThreshold;
        votingDelay = _votingDelay;
        votingPeriod = _votingPeriod;
        quorumPercentage = _quorumPercentage;
        timelockDelay = _timelockDelay;
    }
}
