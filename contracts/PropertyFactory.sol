// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./PropertyToken.sol";
import "./interfaces/IPropertyToken.sol";
import "./interfaces/IKYCRegistry.sol";

/**
 * @title PropertyFactory
 * @dev Factory contract for deploying new PropertyToken instances
 * @dev Uses Clones pattern for gas-efficient deployment
 */
contract PropertyFactory is AccessControl, Pausable, ReentrancyGuard {
    using Clones for address;

    bytes32 public constant PROPERTY_CREATOR_ROLE = keccak256("PROPERTY_CREATOR_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // Implementation contract address
    address public immutable implementation;
    
    // KYC registry reference
    IKYCRegistry public immutable kycRegistry;
    
    // Property registry
    struct PropertyInfo {
        address tokenAddress;
        string name;
        string symbol;
        uint256 maxTokens;
        uint256 tokenPrice;
        string metadataURI;
        address creator;
        uint256 createdAt;
        bool isActive;
    }
    
    mapping(uint256 => PropertyInfo) public properties;
    uint256 public propertyCount;
    
    // Events
    event PropertyCreated(
        uint256 indexed propertyId,
        address indexed tokenAddress,
        string name,
        string symbol,
        uint256 maxTokens,
        uint256 tokenPrice,
        address indexed creator
    );
    event PropertyUpdated(uint256 indexed propertyId, string metadataURI);
    event PropertyDeactivated(uint256 indexed propertyId);
    event ImplementationUpdated(address indexed newImplementation);

    /**
     * @dev Constructor
     * @param _implementation Address of the PropertyToken implementation
     * @param _kycRegistry Address of the KYC registry
     * @param _admin Admin address
     */
    constructor(
        address _implementation,
        address _kycRegistry,
        address _admin
    ) {
        require(_implementation != address(0), "Invalid implementation address");
        require(_kycRegistry != address(0), "Invalid KYC registry address");
        require(_admin != address(0), "Invalid admin address");
        
        implementation = _implementation;
        kycRegistry = IKYCRegistry(_kycRegistry);
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(PROPERTY_CREATOR_ROLE, _admin);
    }

    /**
     * @dev Creates a new property token
     * @param name Property name
     * @param symbol Token symbol
     * @param maxTokens Maximum number of tokens
     * @param tokenPrice Price per token
     * @param metadataURI IPFS URI for property metadata
     * @param propertyLocation Property location
     * @param propertyValue Property value
     * @param transactionID Transaction ID for property connection
     * @param propertyType Type of property (residential, commercial, industrial, land)
     * @param propertyStatus Current status (active, maintenance, sold, foreclosed)
     * @param propertyArea Area in square meters
     * @param coordinates GPS coordinates
     * @return propertyId The ID of the created property
     * @return tokenAddress The address of the created token contract
     */
    function createProperty(
        string memory name,
        string memory symbol,
        uint256 maxTokens,
        uint256 tokenPrice,
        string memory metadataURI,
        string memory propertyLocation,
        uint256 propertyValue,
        string memory transactionID,
        string memory propertyType,
        string memory propertyStatus,
        uint256 propertyArea,
        string memory coordinates
    ) 
        external 
        onlyRole(PROPERTY_CREATOR_ROLE) 
        whenNotPaused 
        nonReentrant 
        returns (uint256 propertyId, address tokenAddress)
    {
        require(bytes(name).length > 0, "Property name required");
        require(bytes(symbol).length > 0, "Token symbol required");
        require(maxTokens > 0, "Max tokens must be greater than 0");
        require(tokenPrice > 0, "Token price must be greater than 0");
        require(bytes(metadataURI).length > 0, "Metadata URI required");
        require(bytes(propertyLocation).length > 0, "Property location required");
        require(propertyValue > 0, "Property value must be greater than 0");
        require(bytes(transactionID).length > 0, "Transaction ID required");
        require(bytes(propertyType).length > 0, "Property type required");
        require(bytes(propertyStatus).length > 0, "Property status required");
        require(propertyArea > 0, "Property area must be greater than 0");
        require(bytes(coordinates).length > 0, "Coordinates required");

        // Deploy new token contract using Clones
        tokenAddress = Clones.clone(implementation);
        
        // Initialize the token contract
        PropertyToken(tokenAddress).initialize(
            name,
            symbol,
            maxTokens,
            address(kycRegistry),
            msg.sender
        );
        
        // Set comprehensive property details
        PropertyToken(tokenAddress).setPropertyDetails(
            name,
            propertyLocation,
            propertyValue,
            metadataURI,
            propertyType,
            propertyStatus,
            propertyArea,
            coordinates
        );
        
        // Set token price
        PropertyToken(tokenAddress).setTokenPrice(tokenPrice);
        
        // Connect to property (if external contract exists)
        if (transactionID.length > 0) {
            PropertyToken(tokenAddress).connectToProperty(address(0), transactionID);
        }
        
        // Grant roles to the creator
        PropertyToken(tokenAddress).grantRole(PropertyToken(tokenAddress).MINTER_ROLE(), msg.sender);
        PropertyToken(tokenAddress).grantRole(PropertyToken(tokenAddress).PROPERTY_MANAGER_ROLE(), msg.sender);
        
        // Register property
        propertyId = ++propertyCount;
        properties[propertyId] = PropertyInfo({
            tokenAddress: tokenAddress,
            name: name,
            symbol: symbol,
            maxTokens: maxTokens,
            tokenPrice: tokenPrice,
            metadataURI: metadataURI,
            creator: msg.sender,
            createdAt: block.timestamp,
            isActive: true
        });

        emit PropertyCreated(
            propertyId,
            tokenAddress,
            name,
            symbol,
            maxTokens,
            tokenPrice,
            msg.sender
        );
    }

    /**
     * @dev Updates property metadata
     * @param propertyId Property ID
     * @param metadataURI New metadata URI
     */
    function updatePropertyMetadata(uint256 propertyId, string memory metadataURI) 
        external 
        onlyRole(PROPERTY_CREATOR_ROLE) 
    {
        require(propertyId > 0 && propertyId <= propertyCount, "Invalid property ID");
        require(properties[propertyId].isActive, "Property not active");
        require(properties[propertyId].creator == msg.sender, "Not property creator");
        require(bytes(metadataURI).length > 0, "Metadata URI required");
        
        properties[propertyId].metadataURI = metadataURI;
        
        emit PropertyUpdated(propertyId, metadataURI);
    }

    /**
     * @dev Deactivates a property
     * @param propertyId Property ID
     */
    function deactivateProperty(uint256 propertyId) 
        external 
        onlyRole(PROPERTY_CREATOR_ROLE) 
    {
        require(propertyId > 0 && propertyId <= propertyCount, "Invalid property ID");
        require(properties[propertyId].isActive, "Property already deactivated");
        require(properties[propertyId].creator == msg.sender, "Not property creator");
        
        properties[propertyId].isActive = false;
        
        emit PropertyDeactivated(propertyId);
    }

    /**
     * @dev Gets property information
     * @param propertyId Property ID
     * @return PropertyInfo struct
     */
    function getProperty(uint256 propertyId) external view returns (PropertyInfo memory) {
        require(propertyId > 0 && propertyId <= propertyCount, "Invalid property ID");
        return properties[propertyId];
    }

    /**
     * @dev Gets all active properties
     * @return Array of active property IDs
     */
    function getActiveProperties() external view returns (uint256[] memory) {
        uint256 activeCount = 0;
        uint256[] memory temp = new uint256[](propertyCount);
        
        for (uint256 i = 1; i <= propertyCount; i++) {
            if (properties[i].isActive) {
                temp[activeCount] = i;
                activeCount++;
            }
        }
        
        uint256[] memory activeProperties = new uint256[](activeCount);
        for (uint256 i = 0; i < activeCount; i++) {
            activeProperties[i] = temp[i];
        }
        
        return activeProperties;
    }

    /**
     * @dev Pauses the factory
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpauses the factory
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Grants property creator role
     * @param account Address to grant role to
     */
    function grantPropertyCreatorRole(address account) external onlyRole(ADMIN_ROLE) {
        grantRole(PROPERTY_CREATOR_ROLE, account);
    }

    /**
     * @dev Revokes property creator role
     * @param account Address to revoke role from
     */
    function revokePropertyCreatorRole(address account) external onlyRole(ADMIN_ROLE) {
        revokeRole(PROPERTY_CREATOR_ROLE, account);
    }
}
