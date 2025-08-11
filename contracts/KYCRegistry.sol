// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IKYCRegistry.sol";

/**
 * @title KYCRegistry
 * @dev Manages KYC verification status for addresses
 */
contract KYCRegistry is IKYCRegistry, AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    struct KYCData {
        bool verified;
        uint256 timestamp;
        uint8 level;
        string metadataURI;
    }

    mapping(address => KYCData) private _kycData;
    mapping(address => bool) private _authorizedVerifiers;
    address[] private _verifiedAddresses;
    
    uint256 private _totalVerified;
    uint8 private _maxKYCLevel = 3;

    modifier onlyVerifier() {
        require(
            hasRole(VERIFIER_ROLE, msg.sender) || _authorizedVerifiers[msg.sender],
            "KYCRegistry: caller is not a verifier"
        );
        _;
    }

    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "KYCRegistry: caller is not an admin");
        _;
    }

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
    }

    /**
     * @dev Check if an address is KYC verified
     */
    function isVerified(address user) external view override returns (bool) {
        return _kycData[user].verified;
    }

    /**
     * @dev Get KYC verification timestamp
     */
    function getVerificationTimestamp(address user) external view override returns (uint256) {
        return _kycData[user].timestamp;
    }

    /**
     * @dev Get KYC verification status with additional data
     */
    function getKYCStatus(address user) external view override returns (bool verified, uint256 timestamp, uint8 level) {
        KYCData memory data = _kycData[user];
        return (data.verified, data.timestamp, data.level);
    }

    /**
     * @dev Verify an address (only callable by authorized verifiers)
     */
    function verifyAddress(address user, uint8 level) external override onlyVerifier whenNotPaused nonReentrant {
        require(user != address(0), "KYCRegistry: invalid address");
        require(level > 0 && level <= _maxKYCLevel, "KYCRegistry: invalid KYC level");

        if (!_kycData[user].verified) {
            _verifiedAddresses.push(user);
            _totalVerified++;
        }

        _kycData[user] = KYCData({
            verified: true,
            timestamp: block.timestamp,
            level: level,
            metadataURI: ""
        });

        emit AddressVerified(user, block.timestamp);
        emit KYCStatusUpdated(user, true, block.timestamp);
    }

    /**
     * @dev Revoke KYC verification for an address
     */
    function revokeVerification(address user) external override onlyVerifier whenNotPaused nonReentrant {
        require(user != address(0), "KYCRegistry: invalid address");
        require(_kycData[user].verified, "KYCRegistry: address not verified");

        _kycData[user].verified = false;
        _kycData[user].timestamp = 0;
        _kycData[user].level = 0;

        // Remove from verified addresses array
        for (uint256 i = 0; i < _verifiedAddresses.length; i++) {
            if (_verifiedAddresses[i] == user) {
                _verifiedAddresses[i] = _verifiedAddresses[_verifiedAddresses.length - 1];
                _verifiedAddresses.pop();
                break;
            }
        }

        _totalVerified--;

        emit AddressRevoked(user, block.timestamp);
        emit KYCStatusUpdated(user, false, block.timestamp);
    }

    /**
     * @dev Check if caller is authorized to verify addresses
     */
    function isAuthorizedVerifier(address verifier) external view override returns (bool) {
        return hasRole(VERIFIER_ROLE, verifier) || _authorizedVerifiers[verifier];
    }

    /**
     * @dev Get total number of verified addresses
     */
    function getTotalVerified() external view override returns (uint256) {
        return _totalVerified;
    }

    /**
     * @dev Get all verified addresses (for admin purposes)
     */
    function getAllVerifiedAddresses() external view override onlyAdmin returns (address[] memory) {
        return _verifiedAddresses;
    }

    /**
     * @dev Add an authorized verifier
     */
    function addAuthorizedVerifier(address verifier) external onlyAdmin {
        require(verifier != address(0), "KYCRegistry: invalid address");
        _authorizedVerifiers[verifier] = true;
    }

    /**
     * @dev Remove an authorized verifier
     */
    function removeAuthorizedVerifier(address verifier) external onlyAdmin {
        require(verifier != address(0), "KYCRegistry: invalid address");
        _authorizedVerifiers[verifier] = false;
    }

    /**
     * @dev Set KYC metadata URI for a user
     */
    function setKYCMetadata(address user, string memory metadataURI) external onlyVerifier {
        require(_kycData[user].verified, "KYCRegistry: address not verified");
        _kycData[user].metadataURI = metadataURI;
    }

    /**
     * @dev Get KYC metadata URI for a user
     */
    function getKYCMetadata(address user) external view returns (string memory) {
        return _kycData[user].metadataURI;
    }

    /**
     * @dev Set maximum KYC level
     */
    function setMaxKYCLevel(uint8 maxLevel) external onlyAdmin {
        require(maxLevel > 0, "KYCRegistry: invalid max level");
        _maxKYCLevel = maxLevel;
    }

    /**
     * @dev Get maximum KYC level
     */
    function getMaxKYCLevel() external view returns (uint8) {
        return _maxKYCLevel;
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
     * @dev Grant verifier role to an address
     */
    function grantVerifierRole(address verifier) external onlyAdmin {
        grantRole(VERIFIER_ROLE, verifier);
    }

    /**
     * @dev Revoke verifier role from an address
     */
    function revokeVerifierRole(address verifier) external onlyAdmin {
        revokeRole(VERIFIER_ROLE, verifier);
    }

    /**
     * @dev Check if an address has verifier role
     */
    function hasVerifierRole(address verifier) external view returns (bool) {
        return hasRole(VERIFIER_ROLE, verifier);
    }
}
