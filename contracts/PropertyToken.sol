// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title PropertyToken
 * @dev Simplified ERC20 token representing fractional ownership of a property
 */
contract PropertyToken is ERC20, Ownable, Pausable {
    uint256 public immutable propertyId;
    uint256 public constant TOTAL_SUPPLY = 1000000 * 10**18; // 1 million tokens
    uint256 public pricePerToken = 1 ether; // 1 ETH per token initially
    
    string public metadataURI;
    address public propertyOwner;
    
    bool private _initialized;
    
    event PropertyPurchased(address indexed buyer, uint256 amount, uint256 totalCost);
    event PriceUpdated(uint256 oldPrice, uint256 newPrice);
    event MetadataUpdated(string oldURI, string newURI);
    
    modifier onlyPropertyOwner() {
        require(msg.sender == propertyOwner, "Only property owner can call this function");
        _;
    }
    
    constructor(
        string memory name,
        string memory symbol,
        uint256 _propertyId,
        address _propertyOwner,
        string memory _metadataURI,
        address _admin
    ) ERC20(name, symbol) Ownable(_admin) {
        propertyId = _propertyId;
        propertyOwner = _propertyOwner;
        metadataURI = _metadataURI;
        
        // Mint all tokens to the property owner initially
        _mint(_propertyOwner, TOTAL_SUPPLY);
    }
    
    /**
     * @dev Initialize function for Clone pattern (called only once)
     * @param name Token name
     * @param symbol Token symbol
     * @param maxTokens Maximum tokens (ignored in this simple version)
     * @param kycRegistry KYC registry address (ignored in this simple version)
     * @param _propertyOwner Property owner address
     */
    function initialize(
        string memory name,
        string memory symbol,
        uint256 maxTokens,
        address kycRegistry,
        address _propertyOwner
    ) external {
        require(!_initialized, "Already initialized");
        _initialized = true;
        
        // Set property owner
        propertyOwner = _propertyOwner;
        
        // Mint all tokens to the property owner initially
        _mint(_propertyOwner, TOTAL_SUPPLY);
    }
    
    /**
     * @dev Purchase tokens with ETH
     * @param amount Number of tokens to purchase
     */
    function purchaseTokens(uint256 amount) external payable whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        uint256 totalCost = amount * pricePerToken / 10**18;
        require(msg.value >= totalCost, "Insufficient payment");
        
        // Transfer tokens from property owner to buyer
        _transfer(propertyOwner, msg.sender, amount);
        
        // Send payment to property owner
        payable(propertyOwner).transfer(totalCost);
        
        // Refund excess payment
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }
        
        emit PropertyPurchased(msg.sender, amount, totalCost);
    }
    
    /**
     * @dev Update price per token (only property owner)
     * @param newPrice New price per token in wei
     */
    function updatePrice(uint256 newPrice) external onlyPropertyOwner {
        require(newPrice > 0, "Price must be greater than 0");
        uint256 oldPrice = pricePerToken;
        pricePerToken = newPrice;
        emit PriceUpdated(oldPrice, newPrice);
    }
    
    /**
     * @dev Update metadata URI (only property owner)
     * @param newURI New metadata URI
     */
    function updateMetadata(string memory newURI) external onlyPropertyOwner {
        string memory oldURI = metadataURI;
        metadataURI = newURI;
        emit MetadataUpdated(oldURI, newURI);
    }
    
    /**
     * @dev Pause the contract (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause the contract (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Get available tokens for sale
     */
    function getAvailableTokens() external view returns (uint256) {
        return balanceOf(propertyOwner);
    }
    
    /**
     * @dev Get total cost for purchasing a specific amount of tokens
     */
    function getCost(uint256 amount) external view returns (uint256) {
        return amount * pricePerToken / 10**18;
    }
    
    /**
     * @dev Set property details (only called during initialization)
     */
    function setPropertyDetails(
        string memory name,
        string memory location,
        uint256 value,
        string memory _metadataURI,
        string memory propertyType,
        string memory status,
        uint256 area,
        string memory coordinates
    ) external {
        require(msg.sender == owner(), "Only owner can set property details");
        metadataURI = _metadataURI;
        // Other details can be stored in metadata URI or emitted as events
    }
    
    /**
     * @dev Set token price (only owner)
     */
    function setTokenPrice(uint256 _pricePerToken) external onlyOwner {
        require(_pricePerToken > 0, "Price must be greater than 0");
        pricePerToken = _pricePerToken;
    }
    
    /**
     * @dev Connect to property (placeholder for future functionality)
     */
    function connectToProperty(address propertyContract, string memory transactionID) external onlyOwner {
        // Placeholder - in the future this could connect to an external property registry
    }
    
    /**
     * @dev Grant role (simplified version - only owner can do anything)
     */
    function grantRole(bytes32 role, address account) external onlyOwner {
        // Placeholder - simplified version
    }
    
    /**
     * @dev Role constants (placeholders)
     */
    function MINTER_ROLE() external pure returns (bytes32) {
        return keccak256("MINTER_ROLE");
    }
    
    function PROPERTY_MANAGER_ROLE() external pure returns (bytes32) {
        return keccak256("PROPERTY_MANAGER_ROLE");
    }
}
