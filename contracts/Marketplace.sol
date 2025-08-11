// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IMarketplace.sol";
import "./interfaces/IKYCRegistry.sol";

/**
 * @title Marketplace
 * @dev Handles property token listings and secondary market transactions
 */
contract Marketplace is IMarketplace, AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant LISTER_ROLE = keccak256("LISTER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    IKYCRegistry public immutable kycRegistry;
    
    uint256 public nextListingId = 1;
    mapping(uint256 => PropertyListing) public listings;
    mapping(uint256 => uint256[]) public propertyListings;
    mapping(address => uint256[]) public sellerListings;
    
    uint256 public platformFee = 50; // 0.5% (basis points)
    uint256 public constant BASIS_POINTS = 10000;
    address public feeCollector;
    
    uint256 public minListingDuration = 1 hours;
    uint256 public maxListingDuration = 365 days;

    modifier onlyLister() {
        require(hasRole(LISTER_ROLE, msg.sender), "Marketplace: caller is not a lister");
        _;
    }

    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Marketplace: caller is not an admin");
        _;
    }

    modifier listingExists(uint256 listingId) {
        require(listings[listingId].propertyId != 0, "Marketplace: listing does not exist");
        _;
    }

    modifier onlyListingOwner(uint256 listingId) {
        require(listings[listingId].seller == msg.sender, "Marketplace: caller is not listing owner");
        _;
    }

    modifier onlyKYCVerified() {
        require(kycRegistry.isVerified(msg.sender), "Marketplace: KYC verification required");
        _;
    }

    constructor(address _kycRegistry, address _feeCollector) {
        require(_kycRegistry != address(0), "Marketplace: invalid KYC registry");
        require(_feeCollector != address(0), "Marketplace: invalid fee collector");

        kycRegistry = IKYCRegistry(_kycRegistry);
        feeCollector = _feeCollector;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(LISTER_ROLE, msg.sender);
    }

    /**
     * @dev Create a new property listing
     */
    function createListing(
        uint256 propertyId,
        uint256 tokenAmount,
        uint256 pricePerToken,
        string memory metadataURI
    ) external override onlyLister onlyKYCVerified whenNotPaused nonReentrant returns (uint256 listingId) {
        require(propertyId > 0, "Marketplace: invalid property ID");
        require(tokenAmount > 0, "Marketplace: invalid token amount");
        require(pricePerToken > 0, "Marketplace: invalid price per token");

        listingId = nextListingId++;
        
        uint256 totalPrice = tokenAmount * pricePerToken;
        uint256 expiresAt = block.timestamp + minListingDuration;

        listings[listingId] = PropertyListing({
            propertyId: propertyId,
            seller: msg.sender,
            tokenAmount: tokenAmount,
            pricePerToken: pricePerToken,
            totalPrice: totalPrice,
            isActive: true,
            createdAt: block.timestamp,
            expiresAt: expiresAt,
            metadataURI: metadataURI
        });

        // Add to property listings
        propertyListings[propertyId].push(listingId);
        
        // Add to seller listings
        sellerListings[msg.sender].push(listingId);

        emit ListingCreated(
            listingId,
            propertyId,
            msg.sender,
            tokenAmount,
            pricePerToken,
            totalPrice
        );

        return listingId;
    }

    /**
     * @dev Update an existing listing
     */
    function updateListing(
        uint256 listingId,
        uint256 tokenAmount,
        uint256 pricePerToken
    ) external override listingExists(listingId) onlyListingOwner(listingId) whenNotPaused {
        require(tokenAmount > 0, "Marketplace: invalid token amount");
        require(pricePerToken > 0, "Marketplace: invalid price per token");
        require(listings[listingId].isActive, "Marketplace: listing not active");

        PropertyListing storage listing = listings[listingId];
        listing.tokenAmount = tokenAmount;
        listing.pricePerToken = pricePerToken;
        listing.totalPrice = tokenAmount * pricePerToken;

        emit ListingUpdated(listingId, tokenAmount, pricePerToken, listing.totalPrice);
    }

    /**
     * @dev Cancel a listing
     */
    function cancelListing(uint256 listingId) external override listingExists(listingId) onlyListingOwner(listingId) {
        require(listings[listingId].isActive, "Marketplace: listing not active");

        listings[listingId].isActive = false;

        emit ListingCancelled(listingId, msg.sender);
    }

    /**
     * @dev Purchase tokens from a listing
     */
    function purchaseTokens(uint256 listingId, uint256 tokenAmount) external payable override listingExists(listingId) onlyKYCVerified whenNotPaused nonReentrant {
        PropertyListing storage listing = listings[listingId];
        require(listing.isActive, "Marketplace: listing not active");
        require(tokenAmount > 0, "Marketplace: invalid token amount");
        require(tokenAmount <= listing.tokenAmount, "Marketplace: insufficient tokens available");
        require(block.timestamp <= listing.expiresAt, "Marketplace: listing expired");

        uint256 totalCost = tokenAmount * listing.pricePerToken;
        require(msg.value == totalCost, "Marketplace: incorrect payment amount");

        // Calculate platform fee
        uint256 platformFeeAmount = calculatePlatformFee(totalCost);
        uint256 sellerAmount = totalCost - platformFeeAmount;

        // Update listing
        listing.tokenAmount -= tokenAmount;
        if (listing.tokenAmount == 0) {
            listing.isActive = false;
        }

        // Transfer platform fee
        (bool feeSuccess, ) = feeCollector.call{value: platformFeeAmount}("");
        require(feeSuccess, "Marketplace: fee transfer failed");

        // Transfer payment to seller
        (bool sellerSuccess, ) = listing.seller.call{value: sellerAmount}("");
        require(sellerSuccess, "Marketplace: seller payment failed");

        emit TokensPurchased(
            listingId,
            listing.propertyId,
            msg.sender,
            listing.seller,
            tokenAmount,
            totalCost
        );
    }

    /**
     * @dev Get listing details
     */
    function getListing(uint256 listingId) external view override returns (PropertyListing memory) {
        return listings[listingId];
    }

    /**
     * @dev Get all active listings for a property
     */
    function getPropertyListings(uint256 propertyId) external view override returns (uint256[] memory) {
        return propertyListings[propertyId];
    }

    /**
     * @dev Get all listings by a seller
     */
    function getSellerListings(address seller) external view override returns (uint256[] memory) {
        return sellerListings[seller];
    }

    /**
     * @dev Get total number of listings
     */
    function getTotalListings() external view override returns (uint256) {
        return nextListingId - 1;
    }

    /**
     * @dev Check if a listing is active
     */
    function isListingActive(uint256 listingId) external view override returns (bool) {
        return listings[listingId].isActive;
    }

    /**
     * @dev Get active listings for a property with pagination
     */
    function getActivePropertyListings(uint256 propertyId, uint256 offset, uint256 limit) external view returns (uint256[] memory) {
        uint256[] memory allListings = propertyListings[propertyId];
        uint256 activeCount = 0;
        
        // Count active listings
        for (uint256 i = 0; i < allListings.length; i++) {
            if (listings[allListings[i]].isActive) {
                activeCount++;
            }
        }

        // Calculate result size
        uint256 start = offset;
        uint256 end = offset + limit;
        if (end > activeCount) {
            end = activeCount;
        }
        if (start >= activeCount) {
            return new uint256[](0);
        }

        uint256[] memory result = new uint256[](end - start);
        uint256 resultIndex = 0;
        uint256 activeIndex = 0;

        for (uint256 i = 0; i < allListings.length && resultIndex < result.length; i++) {
            if (listings[allListings[i]].isActive) {
                if (activeIndex >= start && activeIndex < end) {
                    result[resultIndex] = allListings[i];
                    resultIndex++;
                }
                activeIndex++;
            }
        }

        return result;
    }

    /**
     * @dev Set listing expiration
     */
    function setListingExpiration(uint256 listingId, uint256 newExpiresAt) external listingExists(listingId) onlyListingOwner(listingId) {
        require(newExpiresAt > block.timestamp, "Marketplace: invalid expiration time");
        require(newExpiresAt <= block.timestamp + maxListingDuration, "Marketplace: expiration too far in future");

        listings[listingId].expiresAt = newExpiresAt;
    }

    /**
     * @dev Set platform fee
     */
    function setPlatformFee(uint256 newFee) external onlyAdmin {
        require(newFee <= 500, "Marketplace: fee too high"); // Max 5%
        platformFee = newFee;
    }

    /**
     * @dev Set fee collector
     */
    function setFeeCollector(address newCollector) external onlyAdmin {
        require(newCollector != address(0), "Marketplace: invalid fee collector");
        feeCollector = newCollector;
    }

    /**
     * @dev Set listing duration limits
     */
    function setListingDurationLimits(uint256 minDuration, uint256 maxDuration) external onlyAdmin {
        require(minDuration > 0, "Marketplace: invalid min duration");
        require(maxDuration > minDuration, "Marketplace: invalid max duration");
        require(maxDuration <= 365 days, "Marketplace: max duration too long");

        minListingDuration = minDuration;
        maxListingDuration = maxDuration;
    }

    /**
     * @dev Calculate platform fee for a transaction
     */
    function calculatePlatformFee(uint256 amount) public view returns (uint256) {
        return (amount * platformFee) / BASIS_POINTS;
    }

    /**
     * @dev Pause the contract
     */
    function pause() external onlyAdmin {
        _pause();
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyAdmin {
        _unpause();
    }

    /**
     * @dev Grant lister role to an address
     */
    function grantListerRole(address lister) external onlyAdmin {
        grantRole(LISTER_ROLE, lister);
    }

    /**
     * @dev Revoke lister role from an address
     */
    function revokeListerRole(address lister) external onlyAdmin {
        revokeRole(LISTER_ROLE, lister);
    }

    /**
     * @dev Emergency function to recover stuck tokens
     */
    function emergencyRecoverTokens(address token, address to, uint256 amount) external onlyAdmin {
        require(to != address(0), "Marketplace: invalid recipient");
        require(IERC20(token).transfer(to, amount), "Marketplace: transfer failed");
    }

    /**
     * @dev Emergency function to recover stuck ETH
     */
    function emergencyRecoverETH(address to) external onlyAdmin {
        require(to != address(0), "Marketplace: invalid recipient");
        (bool success, ) = to.call{value: address(this).balance}("");
        require(success, "Marketplace: ETH transfer failed");
    }

    /**
     * @dev Get platform statistics
     */
    function getPlatformStats() external view returns (
        uint256 totalListings,
        uint256 activeListings,
        uint256 totalProperties,
        uint256 platformFeeRate
    ) {
        totalListings = nextListingId - 1;
        activeListings = 0;
        totalProperties = 0;

        // Count active listings and unique properties
        for (uint256 i = 1; i < nextListingId; i++) {
            if (listings[i].isActive) {
                activeListings++;
            }
        }

        // Count unique properties (this could be optimized with a separate mapping)
        for (uint256 i = 1; i < nextListingId; i++) {
            if (listings[i].propertyId != 0) {
                totalProperties++;
            }
        }

        platformFeeRate = platformFee;
    }
}
