// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
/**
 * @title AlkebuleumPropertyToken
 * @dev ERC20 token representing fractional ownership of real estate properties
 * with Alkebuleum-specific features and governance capabilities
 */
contract AlkebuleumPropertyToken is ERC20, ERC20Votes, ERC20Permit, AccessControl, Pausable, ReentrancyGuard {

    // Alkebuleum-specific property types
    enum PropertyType {
        RESIDENTIAL,
        COMMERCIAL,
        INDUSTRIAL,
        LAND,
        MIXED_USE,
        AGRICULTURAL
    }

    // Property status tracking
    enum PropertyStatus {
        ACTIVE,
        MAINTENANCE,
        SOLD,
        FORECLOSED,
        RENTED,
        VACANT,
        UNDER_CONSTRUCTION
    }

    // Valuation sources
    enum ValuationSource {
        APPRAISAL,
        MARKET_ANALYSIS,
        AUTOMATED_VALUATION_MODEL,
        COMPARABLE_SALES,
        INCOME_APPROACH
    }

    // Property information structure
    struct PropertyInfo {
        string name;
        string description;
        string location;
        PropertyType propertyType;
        PropertyStatus status;
        uint256 area; // in square meters
        uint256 latitude; // multiplied by 1e6 for precision
        uint256 longitude; // multiplied by 1e6 for precision
        uint256 valuation;
        ValuationSource valuationSource;
        uint256 lastValuationDate;
        string propertyContractId; // External property contract reference
        string transactionId; // Alkebuleum transaction ID
        string metadataUri; // IPFS URI for additional metadata
    }

    // Property history entry
    struct PropertyHistoryEntry {
        uint256 timestamp;
        string action;
        string description;
        address actor;
        bytes32 changeHash;
    }

    // Roles
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant PROPERTY_MANAGER_ROLE = keccak256("PROPERTY_MANAGER_ROLE");
    bytes32 public constant ALKEBULEUM_ADMIN_ROLE = keccak256("ALKEBULEUM_ADMIN_ROLE");
    bytes32 public constant VALUATOR_ROLE = keccak256("VALUATOR_ROLE");

    // State variables
    uint256 public maxTokens;
    address public kycRegistry;
    PropertyInfo public propertyInfo;
    uint256 private _historyCounter;
    
    mapping(uint256 => PropertyHistoryEntry) public propertyHistory;
    mapping(address => bool) public kycVerifiedUsers;

    // Events
    event PropertyInfoUpdated(
        string name,
        PropertyType propertyType,
        PropertyStatus status,
        uint256 valuation,
        address updatedBy
    );
    
    event PropertyHistoryAdded(
        uint256 entryId,
        string action,
        string description,
        address actor,
        uint256 timestamp
    );
    
    event KYCUserVerified(address user, bool verified);
    event MaxTokensSet(uint256 maxTokens);
    event ValuationUpdated(uint256 oldValuation, uint256 newValuation, ValuationSource source);

    // Errors
    error KYCRequired();
    error MaxTokensExceeded();
    error InvalidPropertyType();
    error InvalidPropertyStatus();
    error InvalidValuationSource();
    error UnauthorizedOperation();
    error InvalidCoordinates();

    /**
     * @dev Constructor for AlkebuleumPropertyToken
     * @param _name Token name
     * @param _symbol Token symbol
     * @param _maxTokens Maximum token supply
     * @param _kycRegistry Address of KYC registry contract
     * @param _propertyInfo Initial property information
     */
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _maxTokens,
        address _kycRegistry,
        PropertyInfo memory _propertyInfo
    ) ERC20(_name, _symbol) ERC20Permit(_name) {
        if (_maxTokens == 0) revert("Max tokens cannot be zero");
        if (_kycRegistry == address(0)) revert("KYC registry cannot be zero address");
        
        maxTokens = _maxTokens;
        kycRegistry = _kycRegistry;
        propertyInfo = _propertyInfo;
        
        // Validate property info
        if (_propertyInfo.area == 0) revert("Property area cannot be zero");
        if (_propertyInfo.valuation == 0) revert("Property valuation cannot be zero");
        
        // Set up roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(PROPERTY_MANAGER_ROLE, msg.sender);
        _grantRole(ALKEBULEUM_ADMIN_ROLE, msg.sender);
        _grantRole(VALUATOR_ROLE, msg.sender);
        
        // Add initial property history entry
        _addPropertyHistory("Property Created", "Initial property tokenization", msg.sender);
        
        emit MaxTokensSet(_maxTokens);
    }

    /**
     * @dev Mint tokens to a specified address
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) whenNotPaused nonReentrant {
        if (totalSupply() + amount > maxTokens) revert MaxTokensExceeded();
        if (!kycVerifiedUsers[to]) revert KYCRequired();
        
        _mint(to, amount);
    }

    /**
     * @dev Burn tokens from a specified address
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     */
    function burn(address from, uint256 amount) external onlyRole(MINTER_ROLE) whenNotPaused nonReentrant {
        _burn(from, amount);
    }

    /**
     * @dev Update property information
     * @param _propertyInfo New property information
     */
    function updatePropertyInfo(PropertyInfo memory _propertyInfo) 
        external 
        onlyRole(PROPERTY_MANAGER_ROLE) 
        whenNotPaused 
    {
        // Validate property info
        if (_propertyInfo.area == 0) revert("Property area cannot be zero");
        if (_propertyInfo.valuation == 0) revert("Property valuation cannot be zero");
        
        uint256 oldValuation = propertyInfo.valuation;
        propertyInfo = _propertyInfo;
        
        _addPropertyHistory(
            "Property Info Updated",
            "Property information updated by manager",
            msg.sender
        );
        
        emit PropertyInfoUpdated(
            _propertyInfo.name,
            _propertyInfo.propertyType,
            _propertyInfo.status,
            _propertyInfo.valuation,
            msg.sender
        );
        
        if (oldValuation != _propertyInfo.valuation) {
            emit ValuationUpdated(oldValuation, _propertyInfo.valuation, _propertyInfo.valuationSource);
        }
    }

    /**
     * @dev Update property valuation
     * @param newValuation New property valuation
     * @param source Valuation source
     */
    function updateValuation(uint256 newValuation, ValuationSource source) 
        external 
        onlyRole(VALUATOR_ROLE) 
        whenNotPaused 
    {
        if (newValuation == 0) revert("Valuation cannot be zero");
        
        uint256 oldValuation = propertyInfo.valuation;
        propertyInfo.valuation = newValuation;
        propertyInfo.valuationSource = source;
        propertyInfo.lastValuationDate = block.timestamp;
        
        _addPropertyHistory(
            "Valuation Updated",
            string(abi.encodePacked("Property valuation updated to ", _uint2str(newValuation))),
            msg.sender
        );
        
        emit ValuationUpdated(oldValuation, newValuation, source);
    }

    /**
     * @dev Update property status
     * @param newStatus New property status
     */
    function updatePropertyStatus(PropertyStatus newStatus) 
        external 
        onlyRole(PROPERTY_MANAGER_ROLE) 
        whenNotPaused 
    {
        propertyInfo.status = newStatus;
        
        _addPropertyHistory(
            "Status Updated",
            string(abi.encodePacked("Property status updated to ", _statusToString(newStatus))),
            msg.sender
        );
        
        emit PropertyInfoUpdated(
            propertyInfo.name,
            propertyInfo.propertyType,
            newStatus,
            propertyInfo.valuation,
            msg.sender
        );
    }

    /**
     * @dev Set KYC verification status for a user
     * @param user Address of the user
     * @param verified Verification status
     */
    function setKYCVerification(address user, bool verified) external onlyRole(ALKEBULEUM_ADMIN_ROLE) {
        kycVerifiedUsers[user] = verified;
        emit KYCUserVerified(user, verified);
    }

    /**
     * @dev Batch set KYC verification status for multiple users
     * @param users Array of user addresses
     * @param verified Array of verification statuses
     */
    function batchSetKYCVerification(address[] memory users, bool[] memory verified) 
        external 
        onlyRole(ALKEBULEUM_ADMIN_ROLE) 
    {
        require(users.length == verified.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < users.length; i++) {
            kycVerifiedUsers[users[i]] = verified[i];
            emit KYCUserVerified(users[i], verified[i]);
        }
    }

    /**
     * @dev Get property history entry
     * @param entryId History entry ID
     * @return PropertyHistoryEntry
     */
    function getPropertyHistoryEntry(uint256 entryId) external view returns (PropertyHistoryEntry memory) {
        return propertyHistory[entryId];
    }

    /**
     * @dev Get total number of history entries
     * @return Total count
     */
    function getPropertyHistoryCount() external view returns (uint256) {
        return _historyCounter;
    }

    /**
     * @dev Override transfer function to check KYC
     */
    function _update(address from, address to, uint256 value) internal virtual override(ERC20, ERC20Votes) {
        if (to != address(0) && !kycVerifiedUsers[to]) revert KYCRequired();
        super._update(from, to, value);
    }

    /**
     * @dev Override nonces function for permit
     */
    function nonces(address owner) public view virtual override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }

    /**
     * @dev Pause all token operations
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause all token operations
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Recover ERC20 tokens sent by mistake
     * @param tokenAddress Address of the token to recover
     * @param amount Amount to recover
     */
    function recoverERC20(address tokenAddress, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20(tokenAddress).transfer(msg.sender, amount);
    }

    /**
     * @dev Add property history entry
     * @param action Action performed
     * @param description Description of the action
     * @param actor Address of the actor
     */
    function _addPropertyHistory(string memory action, string memory description, address actor) internal {
        _historyCounter++;
        uint256 entryId = _historyCounter;
        
        propertyHistory[entryId] = PropertyHistoryEntry({
            timestamp: block.timestamp,
            action: action,
            description: description,
            actor: actor,
            changeHash: keccak256(abi.encodePacked(action, description, actor, block.timestamp))
        });
        
        emit PropertyHistoryAdded(entryId, action, description, actor, block.timestamp);
    }

    /**
     * @dev Convert uint256 to string
     * @param value Value to convert
     * @return String representation
     */
    function _uint2str(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        
        return string(buffer);
    }

    /**
     * @dev Convert PropertyStatus enum to string
     * @param status Property status
     * @return String representation
     */
    function _statusToString(PropertyStatus status) internal pure returns (string memory) {
        if (status == PropertyStatus.ACTIVE) return "ACTIVE";
        if (status == PropertyStatus.MAINTENANCE) return "MAINTENANCE";
        if (status == PropertyStatus.SOLD) return "SOLD";
        if (status == PropertyStatus.FORECLOSED) return "FORECLOSED";
        if (status == PropertyStatus.RENTED) return "RENTED";
        if (status == PropertyStatus.VACANT) return "VACANT";
        if (status == PropertyStatus.UNDER_CONSTRUCTION) return "UNDER_CONSTRUCTION";
        return "UNKNOWN";
    }

    /**
     * @dev Check if user is KYC verified
     * @param user Address to check
     * @return True if verified
     */
    function isKYCVerified(address user) external view returns (bool) {
        return kycVerifiedUsers[user];
    }

    /**
     * @dev Get current property information
     * @return PropertyInfo struct
     */
    function getPropertyInfo() external view returns (PropertyInfo memory) {
        return propertyInfo;
    }
}
