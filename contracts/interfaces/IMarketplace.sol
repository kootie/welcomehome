// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IMarketplace
 * @dev Interface for property marketplace operations
 */
interface IMarketplace {
    /**
     * @dev Property listing structure
     */
    struct PropertyListing {
        uint256 propertyId;
        address seller;
        uint256 tokenAmount;
        uint256 pricePerToken;
        uint256 totalPrice;
        bool isActive;
        uint256 createdAt;
        uint256 expiresAt;
        string metadataURI;
    }

    /**
     * @dev Emitted when a new listing is created
     */
    event ListingCreated(
        uint256 indexed listingId,
        uint256 indexed propertyId,
        address indexed seller,
        uint256 tokenAmount,
        uint256 pricePerToken,
        uint256 totalPrice
    );

    /**
     * @dev Emitted when a listing is updated
     */
    event ListingUpdated(
        uint256 indexed listingId,
        uint256 tokenAmount,
        uint256 pricePerToken,
        uint256 totalPrice
    );

    /**
     * @dev Emitted when a listing is cancelled
     */
    event ListingCancelled(uint256 indexed listingId, address indexed seller);

    /**
     * @dev Emitted when tokens are purchased from a listing
     */
    event TokensPurchased(
        uint256 indexed listingId,
        uint256 indexed propertyId,
        address indexed buyer,
        address seller,
        uint256 tokenAmount,
        uint256 totalPrice
    );

    /**
     * @dev Create a new property listing
     * @param propertyId ID of the property
     * @param tokenAmount Amount of tokens to sell
     * @param pricePerToken Price per token
     * @param metadataURI Additional metadata URI
     */
    function createListing(
        uint256 propertyId,
        uint256 tokenAmount,
        uint256 pricePerToken,
        string memory metadataURI
    ) external returns (uint256 listingId);

    /**
     * @dev Update an existing listing
     * @param listingId ID of the listing to update
     * @param tokenAmount New token amount
     * @param pricePerToken New price per token
     */
    function updateListing(
        uint256 listingId,
        uint256 tokenAmount,
        uint256 pricePerToken
    ) external;

    /**
     * @dev Cancel a listing
     * @param listingId ID of the listing to cancel
     */
    function cancelListing(uint256 listingId) external;

    /**
     * @dev Purchase tokens from a listing
     * @param listingId ID of the listing to purchase from
     * @param tokenAmount Amount of tokens to purchase
     */
    function purchaseTokens(uint256 listingId, uint256 tokenAmount) external payable;

    /**
     * @dev Get listing details
     * @param listingId ID of the listing
     * @return Listing details
     */
    function getListing(uint256 listingId) external view returns (PropertyListing memory);

    /**
     * @dev Get all active listings for a property
     * @param propertyId ID of the property
     * @return Array of listing IDs
     */
    function getPropertyListings(uint256 propertyId) external view returns (uint256[] memory);

    /**
     * @dev Get all listings by a seller
     * @param seller Address of the seller
     * @return Array of listing IDs
     */
    function getSellerListings(address seller) external view returns (uint256[] memory);

    /**
     * @dev Get total number of listings
     * @return Count of listings
     */
    function getTotalListings() external view returns (uint256);

    /**
     * @dev Check if a listing is active
     * @param listingId ID of the listing
     * @return True if active
     */
    function isListingActive(uint256 listingId) external view returns (bool);
}
