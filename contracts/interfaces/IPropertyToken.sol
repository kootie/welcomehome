// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPropertyToken
 * @dev Interface for property tokens representing fractional ownership
 */
interface IPropertyToken {
    /**
     * @dev Emitted when a property is created
     */
    event PropertyCreated(
        uint256 indexed propertyId,
        string name,
        string symbol,
        uint256 totalSupply,
        uint256 pricePerUnit,
        string metadataURI
    );

    /**
     * @dev Emitted when tokens are purchased
     */
    event TokensPurchased(
        address indexed buyer,
        uint256 indexed propertyId,
        uint256 amount,
        uint256 totalCost
    );

    /**
     * @dev Emitted when tokens are transferred
     */
    event TokensTransferred(
        address indexed from,
        address indexed to,
        uint256 indexed propertyId,
        uint256 amount
    );

    /**
     * @dev Returns the property ID
     */
    function propertyId() external view returns (uint256);

    /**
     * @dev Returns the property name
     */
    function propertyName() external view returns (string memory);

    /**
     * @dev Returns the property symbol
     */
    function propertySymbol() external view returns (string memory);

    /**
     * @dev Returns the total supply of tokens
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the price per unit
     */
    function pricePerUnit() external view returns (uint256);

    /**
     * @dev Returns the metadata URI
     */
    function metadataURI() external view returns (string memory);

    /**
     * @dev Returns the property owner/admin
     */
    function propertyOwner() external view returns (address);

    /**
     * @dev Returns the KYC registry contract
     */
    function kycRegistry() external view returns (address);

    /**
     * @dev Purchase tokens for a property
     * @param amount Number of tokens to purchase
     */
    function purchaseTokens(uint256 amount) external payable;

    /**
     * @dev Transfer tokens to another address (only for KYC verified addresses)
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function transferTokens(address to, uint256 amount) external;

    /**
     * @dev Get token balance for a specific address
     * @param owner Address to check balance for
     */
    function balanceOf(address owner) external view returns (uint256);
}
