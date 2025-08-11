// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IKYCRegistry
 * @dev Interface for KYC verification registry
 */
interface IKYCRegistry {
    /**
     * @dev Emitted when an address is KYC verified
     */
    event AddressVerified(address indexed user, uint256 timestamp);

    /**
     * @dev Emitted when an address is revoked from KYC
     */
    event AddressRevoked(address indexed user, uint256 timestamp);

    /**
     * @dev Emitted when KYC status is updated
     */
    event KYCStatusUpdated(address indexed user, bool verified, uint256 timestamp);

    /**
     * @dev Check if an address is KYC verified
     * @param user Address to check
     * @return True if verified, false otherwise
     */
    function isVerified(address user) external view returns (bool);

    /**
     * @dev Get KYC verification timestamp
     * @param user Address to check
     * @return Timestamp when verified, 0 if not verified
     */
    function getVerificationTimestamp(address user) external view returns (uint256);

    /**
     * @dev Get KYC verification status with additional data
     * @param user Address to check
     * @return verified True if verified
     * @return timestamp Timestamp when verified
     * @return level KYC verification level (1-3)
     */
    function getKYCStatus(address user) external view returns (bool verified, uint256 timestamp, uint8 level);

    /**
     * @dev Verify an address (only callable by authorized verifiers)
     * @param user Address to verify
     * @param level KYC verification level (1-3)
     */
    function verifyAddress(address user, uint8 level) external;

    /**
     * @dev Revoke KYC verification for an address (only callable by authorized verifiers)
     * @param user Address to revoke
     */
    function revokeVerification(address user) external;

    /**
     * @dev Check if caller is authorized to verify addresses
     * @return True if authorized
     */
    function isAuthorizedVerifier(address verifier) external view returns (bool);

    /**
     * @dev Get total number of verified addresses
     * @return Count of verified addresses
     */
    function getTotalVerified() external view returns (uint256);

    /**
     * @dev Get all verified addresses (for admin purposes)
     * @return Array of verified addresses
     */
    function getAllVerifiedAddresses() external view returns (address[] memory);
}
