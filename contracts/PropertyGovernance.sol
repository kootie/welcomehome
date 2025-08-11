// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import "./interfaces/IPropertyToken.sol";

/**
 * @title PropertyGovernance
 * @dev Governance contract for property tokens using ERC20Votes
 * @dev Allows token holders to propose and vote on property-related decisions
 */
contract PropertyGovernance is 
    Governor, 
    GovernorSettings, 
    GovernorCountingSimple, 
    GovernorVotes, 
    GovernorVotesQuorumFraction, 
    GovernorTimelockControl 
{
    bytes32 public constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // Property token reference
    IPropertyToken public immutable propertyToken;
    
    // Governance parameters
    uint256 public constant MIN_PROPOSAL_THRESHOLD = 1000 * 10**18; // 1000 tokens
    uint256 public constant MIN_VOTING_PERIOD = 1 days;
    uint256 public constant MAX_VOTING_PERIOD = 30 days;
    uint256 public constant MIN_VOTING_DELAY = 1 hours;
    uint256 public constant MAX_VOTING_DELAY = 7 days;
    
    // Proposal tracking
    mapping(uint256 => string) public proposalDescriptions;
    mapping(uint256 => bool) public proposalExecuted;
    
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
    event ProposalExecuted(uint256 indexed proposalId, address indexed executor);
    event GovernanceParametersUpdated(
        uint256 newProposalThreshold,
        uint256 newVotingDelay,
        uint256 newVotingPeriod,
        uint256 newQuorumPercentage
    );

    /**
     * @dev Constructor
     * @param _propertyToken Address of the property token
     * @param _timelock Address of the timelock controller
     * @param _admin Admin address
     */
    constructor(
        address _propertyToken,
        address _timelock,
        address _admin
    ) 
        Governor("PropertyGovernance")
        GovernorSettings(
            MIN_PROPOSAL_THRESHOLD, // proposal threshold
            MIN_VOTING_DELAY,       // voting delay
            MIN_VOTING_PERIOD       // voting period
        )
        GovernorVotesQuorumFraction(4) // 4% quorum
        GovernorTimelockControl(_timelock)
    {
        require(_propertyToken != address(0), "Invalid property token address");
        require(_timelock != address(0), "Invalid timelock address");
        require(_admin != address(0), "Invalid admin address");
        
        propertyToken = IPropertyToken(_propertyToken);
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(PROPOSER_ROLE, _admin);
        _grantRole(EXECUTOR_ROLE, _admin);
    }

    /**
     * @dev Creates a new proposal
     * @param targets Array of target addresses for the proposal
     * @param values Array of ETH values for the proposal
     * @param signatures Array of function signatures
     * @param calldatas Array of encoded function calls
     * @param description Description of the proposal
     * @return proposalId The ID of the created proposal
     */
    function propose(
        address[] memory targets,
        uint256[] memory values,
        string[] memory signatures,
        bytes[] memory calldatas,
        string memory description
    ) 
        public 
        override(Governor, GovernorSettings) 
        returns (uint256 proposalId) 
    {
        require(hasRole(PROPOSER_ROLE, msg.sender) || 
                propertyToken.getVotes(msg.sender) >= proposalThreshold(), 
                "Insufficient voting power or not proposer");
        
        proposalId = super.propose(targets, values, signatures, calldatas, description);
        
        proposalDescriptions[proposalId] = description;
        
        emit ProposalCreated(
            proposalId,
            msg.sender,
            description,
            targets,
            values,
            signatures,
            calldatas
        );
    }

    /**
     * @dev Executes a proposal
     * @param targets Array of target addresses
     * @param values Array of ETH values
     * @param signatures Array of function signatures
     * @param calldatas Array of encoded function calls
     * @param descriptionHash Hash of the proposal description
     */
    function execute(
        address[] memory targets,
        uint256[] memory values,
        string[] memory signatures,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) 
        public 
        payable 
        override(Governor, GovernorTimelockControl) 
    {
        super.execute(targets, values, signatures, calldatas, descriptionHash);
        
        uint256 proposalId = hashProposal(targets, values, signatures, calldatas, descriptionHash);
        proposalExecuted[proposalId] = true;
        
        emit ProposalExecuted(proposalId, msg.sender);
    }

    /**
     * @dev Updates governance parameters
     * @param _proposalThreshold New proposal threshold
     * @param _votingDelay New voting delay
     * @param _votingPeriod New voting period
     * @param _quorumPercentage New quorum percentage
     */
    function updateGovernanceParameters(
        uint256 _proposalThreshold,
        uint256 _votingDelay,
        uint256 _votingPeriod,
        uint256 _quorumPercentage
    ) external onlyRole(ADMIN_ROLE) {
        require(_proposalThreshold >= MIN_PROPOSAL_THRESHOLD, "Proposal threshold too low");
        require(_votingDelay >= MIN_VOTING_DELAY && _votingDelay <= MAX_VOTING_DELAY, "Invalid voting delay");
        require(_votingPeriod >= MIN_VOTING_PERIOD && _votingPeriod <= MAX_VOTING_PERIOD, "Invalid voting period");
        require(_quorumPercentage >= 1 && _quorumPercentage <= 20, "Invalid quorum percentage");
        
        _updateSettings(_proposalThreshold, _votingDelay, _votingPeriod);
        _updateQuorumNumerator(_quorumPercentage);
        
        emit GovernanceParametersUpdated(
            _proposalThreshold,
            _votingDelay,
            _votingPeriod,
            _quorumPercentage
        );
    }

    /**
     * @dev Gets proposal description
     * @param proposalId Proposal ID
     * @return Description of the proposal
     */
    function getProposalDescription(uint256 proposalId) external view returns (string memory) {
        return proposalDescriptions[proposalId];
    }

    /**
     * @dev Checks if a proposal has been executed
     * @param proposalId Proposal ID
     * @return True if executed, false otherwise
     */
    function isProposalExecuted(uint256 proposalId) external view returns (bool) {
        return proposalExecuted[proposalId];
    }

    /**
     * @dev Gets the voting power of an address at a specific block
     * @param account Address to check
     * @param blockNumber Block number
     * @return Voting power
     */
    function getVotes(address account, uint256 blockNumber) 
        public 
        view 
        override(IGovernor, GovernorVotes) 
        returns (uint256) 
    {
        return super.getVotes(account, blockNumber);
    }

    /**
     * @dev Gets the current voting power of an address
     * @param account Address to check
     * @return Current voting power
     */
    function getCurrentVotes(address account) external view returns (uint256) {
        return propertyToken.getVotes(account);
    }

    /**
     * @dev Gets the past voting power of an address
     * @param account Address to check
     * @param blockNumber Block number
     * @return Past voting power
     */
    function getPastVotes(address account, uint256 blockNumber) external view returns (uint256) {
        return propertyToken.getPastVotes(account, blockNumber);
    }

    /**
     * @dev Gets the total supply at a specific block
     * @param blockNumber Block number
     * @return Total supply
     */
    function getPastTotalSupply(uint256 blockNumber) external view returns (uint256) {
        return propertyToken.getPastTotalSupply(blockNumber);
    }

    // Required overrides
    function votingDelay()
        public
        view
        override(IGovernor, GovernorSettings)
        returns (uint256)
    {
        return super.votingDelay();
    }

    function votingPeriod()
        public
        view
        override(IGovernor, GovernorSettings)
        returns (uint256)
    {
        return super.votingPeriod();
    }

    function quorum(uint256 blockNumber)
        public
        view
        override(IGovernor, GovernorVotesQuorumFraction)
        returns (uint256)
    {
        return super.quorum(blockNumber);
    }

    function state(uint256 proposalId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (ProposalState)
    {
        return super.state(proposalId);
    }

    function proposalThreshold()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.proposalThreshold();
    }

    function _execute(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) {
        super._execute(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        string[] memory signatures,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint256) {
        return super._cancel(targets, values, signatures, calldatas, descriptionHash);
    }

    function _executor()
        internal
        view
        override(Governor, GovernorTimelockControl)
        returns (address)
    {
        return super._executor();
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {}
}
