// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IAlkebuleumProperty
 * @dev Interface for Alkebuleum blockchain property token functionality
 * @dev Extends the base property token interface with Alkebuleum-specific features
 */
interface IAlkebuleumProperty {
    
    // Property Types
    enum PropertyType {
        RESIDENTIAL,
        COMMERCIAL,
        INDUSTRIAL,
        LAND,
        MIXED_USE,
        AGRICULTURAL
    }
    
    // Property Status
    enum PropertyStatus {
        ACTIVE,
        MAINTENANCE,
        SOLD,
        FORECLOSED,
        RENTED,
        VACANT,
        UNDER_CONSTRUCTION
    }
    
    // Valuation Source
    enum ValuationSource {
        APPRAISAL,
        MARKET_ANALYSIS,
        AUTOMATED_VALUATION_MODEL,
        COMPARABLE_SALES,
        INCOME_APPROACH
    }
    
    // Events
    event PropertyTypeUpdated(PropertyType indexed oldType, PropertyType indexed newType);
    event PropertyStatusUpdated(PropertyStatus indexed oldStatus, PropertyStatus indexed newStatus);
    event PropertyValuationUpdated(uint256 indexed oldValue, uint256 indexed newValue, ValuationSource source);
    event PropertyAreaUpdated(uint256 indexed oldArea, uint256 indexed newArea);
    event PropertyCoordinatesUpdated(string indexed oldCoordinates, string indexed newCoordinates);
    event AlkebuleumMetadataUpdated(string metadataURI, uint256 timestamp);
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    
    // Property Information Functions
    function getPropertyType() external view returns (PropertyType);
    function getPropertyStatus() external view returns (PropertyStatus);
    function getPropertyArea() external view returns (uint256);
    function getPropertyCoordinates() external view returns (string memory);
    function getLastValuationDate() external view returns (uint256);
    function getValuationSource() external view returns (ValuationSource);
    function getPlatformFee() external view returns (uint256);
    
    // Property Management Functions
    function updatePropertyType(PropertyType newType) external;
    function updatePropertyStatus(PropertyStatus newStatus) external;
    function updatePropertyArea(uint256 newArea) external;
    function updatePropertyCoordinates(string memory newCoordinates) external;
    function updatePropertyValuation(uint256 newValue, ValuationSource source) external;
    
    // Alkebuleum-Specific Functions
    function setAlkebuleumMetadata(string memory metadataURI, uint256 valuationDate, ValuationSource source) external;
    function getAlkebuleumChainId() external view returns (uint256);
    function calculatePlatformFee(uint256 amount) external view returns (uint256);
    function setPlatformFee(uint256 newFee) external;
    
    // Comprehensive Property Info
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
        uint256 maxTokens,
        uint256 tokenPrice,
        uint256 totalIssued
    );
}
