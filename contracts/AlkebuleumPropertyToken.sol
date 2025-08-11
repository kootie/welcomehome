// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./interfaces/IAlkebuleumProperty.sol";
import "./interfaces/IKYCRegistry.sol";

/**
 * @title AlkebuleumPropertyToken
 * @dev ERC20 token representing fractional ownership of a property on Alkebuleum
 * @dev Implements IAlkebuleumProperty interface with blockchain-specific features
 * @dev Optimized for Alkebuleum deployment with enhanced property metadata
 */
contract AlkebuleumPropertyToken is 
    ERC20, 
    ERC20Permit, 
    ERC20Votes, 
    AccessControl, 
    Pausable, 
    ReentrancyGuard,
    IAlkebuleumProperty 
{
    using Counters for Counters.Counter;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PROPERTY_MANAGER_ROLE = keccak256("PROPERTY_MANAGER_ROLE");
    bytes32 public constant ALKEBULEUM_ADMIN_ROLE = keccak256("ALKEBULEUM_ADMIN_ROLE");
    bytes32 public constant VALUATOR_ROLE = keccak256("VALUATOR_ROLE");

    // Property details (Alkebuleum-specific)
    string public propertyName;
    string public propertyLocation;
    uint256 public propertyValue;
    string public propertyMetadataURI;
    uint256 public maxTokens;
    
    // Alkebuleum-specific fields
    PropertyType public propertyType;
    PropertyStatus public propertyStatus;
    uint256 public propertyArea; // in square meters
    string public propertyCoordinates; // GPS coordinates
    uint256 public lastValuationDate;
    ValuationSource public valuationSource;
    
    // Property connection tracking
    address public connectedPropertyContract;
    string public transactionID;
    
    // Token economics
    uint256 public tokenPrice;
    uint256 public totalTokensIssued;
    uint256 public platformFee; // Alkebuleum platform fee (basis points)
    
    // KYC registry reference
    IKYCRegistry public kycRegistry;
    
    // Alkebuleum network identifier
    uint256 public constant ALKEBULEUM_CHAIN_ID = 1337; // Update with actual chain ID
    
    // Property history tracking
    struct PropertyHistory {
        uint256 timestamp;
        PropertyType propertyType;
        PropertyStatus propertyStatus;
        uint256 propertyValue;
        uint256 propertyArea;
        string propertyCoordinates;
        ValuationSource valuationSource;
        string metadataURI;
    }
    
    PropertyHistory[] public propertyHistory;
    
    // Events
    event PropertyConnected(address indexed property, string transactionID);
    event MaxTokensSet(uint256 newMax);
    event TokenPriceUpdated(uint256 newPrice);
    event TokensIssued(address indexed to, uint256 amount, uint256 totalIssued);
    event PropertyTypeUpdated(PropertyType indexed oldType, PropertyType indexed newType);
    event PropertyStatusUpdated(PropertyStatus indexed oldStatus, PropertyStatus indexed newStatus);
    event PropertyValuationUpdated(uint256 indexed oldValue, uint256 indexed newValue, ValuationSource source);
    event PropertyAreaUpdated(uint256 indexed oldArea, uint256 indexed newArea);
    event PropertyCoordinatesUpdated(string indexed oldCoordinates, string indexed newCoordinates);
    event AlkebuleumMetadataUpdated(string metadataURI, uint256 timestamp);
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);

    /**
     * @dev Constructor
     * @param _name Token name
     * @param _symbol Token symbol
     * @param _maxTokens Maximum number of tokens that can ever be minted
     * @param _kycRegistry Address of the KYC registry
     * @param _admin Admin address with DEFAULT_ADMIN_ROLE
     */
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _maxTokens,
        address _kycRegistry,
        address _admin
    ) 
        ERC20(_name, _symbol) 
        ERC20Permit(_name)
    {
        require(_maxTokens > 0, "Max tokens must be greater than 0");
        require(_kycRegistry != address(0), "Invalid KYC registry address");
        require(_admin != address(0), "Invalid admin address");
        
        maxTokens = _maxTokens;
        kycRegistry = IKYCRegistry(_kycRegistry);
        platformFee = 25; // 0.25% default platform fee
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(PAUSER_ROLE, _admin);
        _grantRole(MINTER_ROLE, _admin);
        _grantRole(PROPERTY_MANAGER_ROLE, _admin);
        _grantRole(ALKEBULEUM_ADMIN_ROLE, _admin);
        _grantRole(VALUATOR_ROLE, _admin);
    }

    /**
     * @dev Initialize function for proxy/clone deployment
     * @param _name Token name
     * @param _symbol Token symbol
     * @param _maxTokens Maximum number of tokens
     * @param _kycRegistry Address of the KYC registry
     * @param _admin Admin address
     */
    function initialize(
        string memory _name,
        string memory _symbol,
        uint256 _maxTokens,
        address _kycRegistry,
        address _admin
    ) external {
        require(bytes(_name).length > 0, "Name required");
        require(bytes(_symbol).length > 0, "Symbol required");
        require(_maxTokens > 0, "Max tokens must be greater than 0");
        require(_kycRegistry != address(0), "Invalid KYC registry address");
        require(_admin != address(0), "Invalid admin address");
        
        // Only allow initialization once
        require(maxTokens == 0, "Already initialized");
        
        maxTokens = _maxTokens;
        kycRegistry = IKYCRegistry(_kycRegistry);
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(PAUSER_ROLE, _admin);
        _grantRole(MINTER_ROLE, _admin);
        _grantRole(PROPERTY_MANAGER_ROLE, _admin);
        _grantRole(ALKEBULEUM_ADMIN_ROLE, _admin);
        _grantRole(VALUATOR_ROLE, _admin);
    }

    /**
     * @dev Connects this token to a property contract and sets the transaction ID
     * @param propertyAddress The address of the property contract
     * @param newTransactionID The transaction ID
     */
    function connectToProperty(address propertyAddress, string memory newTransactionID) 
        external 
        onlyRole(PROPERTY_MANAGER_ROLE) 
    {
        require(propertyAddress != address(0), "Invalid property address");
        require(bytes(newTransactionID).length > 0, "Transaction ID required");
        
        connectedPropertyContract = propertyAddress;
        transactionID = newTransactionID;
        
        emit PropertyConnected(propertyAddress, newTransactionID);
    }

    /**
     * @dev Sets comprehensive property details for Alkebuleum
     * @param _name Property name
     * @param _location Property location
     * @param _value Property value
     * @param _metadataURI IPFS URI for property metadata
     * @param _propertyType Type of property
     * @param _propertyStatus Current status
     * @param _propertyArea Area in square meters
     * @param _coordinates GPS coordinates
     */
    function setPropertyDetails(
        string memory _name,
        string memory _location,
        uint256 _value,
        string memory _metadataURI,
        PropertyType _propertyType,
        PropertyStatus _propertyStatus,
        uint256 _propertyArea,
        string memory _coordinates
    ) external onlyRole(PROPERTY_MANAGER_ROLE) {
        propertyName = _name;
        propertyLocation = _location;
        propertyValue = _value;
        propertyMetadataURI = _metadataURI;
        propertyType = _propertyType;
        propertyStatus = _propertyStatus;
        propertyArea = _propertyArea;
        propertyCoordinates = _coordinates;
        
        // Record in history
        _recordPropertyHistory();
        
        emit PropertyTypeUpdated(PropertyType(0), _propertyType);
        emit PropertyStatusUpdated(PropertyStatus(0), _propertyStatus);
    }

    /**
     * @dev Updates property type
     * @param newType New property type
     */
    function updatePropertyType(PropertyType newType) external onlyRole(PROPERTY_MANAGER_ROLE) {
        PropertyType oldType = propertyType;
        propertyType = newType;
        
        _recordPropertyHistory();
        emit PropertyTypeUpdated(oldType, newType);
    }

    /**
     * @dev Updates property status
     * @param newStatus New property status
     */
    function updatePropertyStatus(PropertyStatus newStatus) external onlyRole(PROPERTY_MANAGER_ROLE) {
        PropertyStatus oldStatus = propertyStatus;
        propertyStatus = newStatus;
        
        _recordPropertyHistory();
        emit PropertyStatusUpdated(oldStatus, newStatus);
    }

    /**
     * @dev Updates property area
     * @param newArea New property area in square meters
     */
    function updatePropertyArea(uint256 newArea) external onlyRole(PROPERTY_MANAGER_ROLE) {
        require(newArea > 0, "Area must be greater than 0");
        uint256 oldArea = propertyArea;
        propertyArea = newArea;
        
        _recordPropertyHistory();
        emit PropertyAreaUpdated(oldArea, newArea);
    }

    /**
     * @dev Updates property coordinates
     * @param newCoordinates New GPS coordinates
     */
    function updatePropertyCoordinates(string memory newCoordinates) external onlyRole(PROPERTY_MANAGER_ROLE) {
        require(bytes(newCoordinates).length > 0, "Coordinates required");
        string memory oldCoordinates = propertyCoordinates;
        propertyCoordinates = newCoordinates;
        
        _recordPropertyHistory();
        emit PropertyCoordinatesUpdated(oldCoordinates, newCoordinates);
    }

    /**
     * @dev Updates property valuation
     * @param newValue New property value
     * @param source Source of valuation
     */
    function updatePropertyValuation(uint256 newValue, ValuationSource source) external onlyRole(VALUATOR_ROLE) {
        require(newValue > 0, "Value must be greater than 0");
        uint256 oldValue = propertyValue;
        propertyValue = newValue;
        valuationSource = source;
        lastValuationDate = block.timestamp;
        
        _recordPropertyHistory();
        emit PropertyValuationUpdated(oldValue, newValue, source);
    }

    /**
     * @dev Updates Alkebuleum-specific metadata
     * @param _metadataURI New metadata URI
     * @param _valuationDate New valuation date
     * @param _source Source of valuation
     */
    function setAlkebuleumMetadata(
        string memory _metadataURI,
        uint256 _valuationDate,
        ValuationSource _source
    ) external onlyRole(ALKEBULEUM_ADMIN_ROLE) {
        require(bytes(_metadataURI).length > 0, "Metadata URI required");
        require(_valuationDate > 0, "Invalid valuation date");
        
        propertyMetadataURI = _metadataURI;
        lastValuationDate = _valuationDate;
        valuationSource = _source;
        
        _recordPropertyHistory();
        emit AlkebuleumMetadataUpdated(_metadataURI, _valuationDate);
    }

    /**
     * @dev Sets the token price
     * @param _price New token price
     */
    function setTokenPrice(uint256 _price) external onlyRole(PROPERTY_MANAGER_ROLE) {
        tokenPrice = _price;
        emit TokenPriceUpdated(_price);
    }

    /**
     * @dev Sets the platform fee for Alkebuleum
     * @param _fee New platform fee in basis points
     */
    function setPlatformFee(uint256 _fee) external onlyRole(ALKEBULEUM_ADMIN_ROLE) {
        require(_fee <= 100, "Platform fee cannot exceed 1%");
        uint256 oldFee = platformFee;
        platformFee = _fee;
        emit PlatformFeeUpdated(oldFee, _fee);
    }

    /**
     * @dev Issues new tokens to an address (primary offering)
     * @param to Address to receive tokens
     * @param amount Amount of tokens to issue
     */
    function issueTokens(address to, uint256 amount) 
        external 
        onlyRole(MINTER_ROLE) 
        whenNotPaused 
    {
        require(to != address(0), "Cannot issue to zero address");
        require(amount > 0, "Amount must be greater than 0");
        require(kycRegistry.isVerified(to), "Recipient must be KYC verified");
        
        // Check max tokens cap
        require((totalTokensIssued + amount) <= maxTokens, "Exceeds max tokens cap");
        
        totalTokensIssued += amount;
        _mint(to, amount);
        
        emit TokensIssued(to, amount, totalTokensIssued);
    }

    /**
     * @dev Calculates platform fee for a transaction
     * @param amount Transaction amount
     * @return fee The calculated platform fee
     */
    function calculatePlatformFee(uint256 amount) public view returns (uint256 fee) {
        return (amount * platformFee) / 10000;
    }

    /**
     * @dev Gets Alkebuleum chain ID
     * @return Chain ID for Alkebuleum
     */
    function getAlkebuleumChainId() external view returns (uint256) {
        return ALKEBULEUM_CHAIN_ID;
    }

    /**
     * @dev Gets comprehensive property information for Alkebuleum
     * @return name Property name
     * @return location Property location
     * @return value Property value
     * @return metadataURI Metadata URI
     * @return type_ Property type
     * @return status Property status
     * @return area Property area
     * @return coordinates GPS coordinates
     * @return valuationDate Last valuation date
     * @return valuationSource Valuation source
     * @return maxTokens Maximum tokens
     * @return tokenPrice Token price
     * @return totalIssued Total tokens issued
     */
    function getAlkebuleumPropertyInfo() external view returns (
        string memory name,
        string memory location,
        uint256 value,
        string memory metadataURI,
        PropertyType type_,
        PropertyStatus status,
        uint256 area,
        string memory coordinates,
        uint256 valuationDate,
        ValuationSource valuationSource,
        uint256 maxTokens_,
        uint256 tokenPrice_,
        uint256 totalIssued
    ) {
        return (
            propertyName,
            propertyLocation,
            propertyValue,
            propertyMetadataURI,
            propertyType,
            propertyStatus,
            propertyArea,
            propertyCoordinates,
            lastValuationDate,
            this.valuationSource(),
            maxTokens,
            tokenPrice,
            totalTokensIssued
        );
    }

    /**
     * @dev Gets property history
     * @return Array of property history records
     */
    function getPropertyHistory() external view returns (PropertyHistory[] memory) {
        return propertyHistory;
    }

    /**
     * @dev Pauses all token transfers
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Unpauses all token transfers
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Allows the admin to recover ERC20 tokens sent to this contract by mistake
     * @param tokenAddress The address of the ERC20 token to recover
     * @param tokenAmount The amount of tokens to recover
     */
    function recoverERC20(address tokenAddress, uint256 tokenAmount) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
        nonReentrant 
    {
        require(tokenAddress != address(0), "Invalid token address");
        require(tokenAmount > 0, "Amount must be greater than zero");
        require(tokenAddress != address(this), "Cannot recover own tokens");
        
        IERC20(tokenAddress).transfer(msg.sender, tokenAmount);
    }

    /**
     * @dev Records property history for tracking changes
     */
    function _recordPropertyHistory() internal {
        propertyHistory.push(PropertyHistory({
            timestamp: block.timestamp,
            propertyType: propertyType,
            propertyStatus: propertyStatus,
            propertyValue: propertyValue,
            propertyArea: propertyArea,
            propertyCoordinates: propertyCoordinates,
            valuationSource: valuationSource,
            metadataURI: propertyMetadataURI
        }));
    }

    // Override functions for ERC20Votes
    function _afterTokenTransfer(address from, address to, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._burn(account, amount);
    }

    // Override functions for Pausable
    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        whenNotPaused
        override
    {
        super._beforeTokenTransfer(from, to, amount);
    }

    // Required overrides
    function nonces(address owner)
        public
        view
        override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }
}
