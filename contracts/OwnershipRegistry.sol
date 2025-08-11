// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IKYCRegistry.sol";

/**
 * @title OwnershipRegistry
 * @dev Tracks property token ownership and provides queryable data
 */
contract OwnershipRegistry is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    struct PropertyOwnership {
        uint256 propertyId;
        address tokenContract;
        string propertyName;
        string propertySymbol;
        uint256 totalSupply;
        uint256 circulatingSupply;
        uint256 totalHolders;
        bool isActive;
        uint256 createdAt;
    }

    struct UserHoldings {
        uint256 propertyId;
        address tokenContract;
        uint256 balance;
        uint256 purchaseTimestamp;
        uint256 lastTransferTimestamp;
        bool isActive;
    }

    struct TransferRecord {
        address from;
        address to;
        uint256 propertyId;
        uint256 amount;
        uint256 timestamp;
        string transactionHash;
    }

    IKYCRegistry public immutable kycRegistry;
    
    mapping(uint256 => PropertyOwnership) public properties;
    mapping(address => UserHoldings[]) public userHoldings;
    mapping(address => mapping(uint256 => uint256)) public userPropertyIndex;
    mapping(uint256 => address[]) public propertyHolders;
    mapping(address => mapping(uint256 => bool)) public isPropertyHolder;
    
    TransferRecord[] public transferRecords;
    uint256 public nextPropertyId = 1;
    uint256 public totalProperties = 0;
    uint256 public totalUsers = 0;

    event PropertyRegistered(
        uint256 indexed propertyId,
        address indexed tokenContract,
        string name,
        string symbol,
        uint256 totalSupply
    );

    event OwnershipUpdated(
        address indexed user,
        uint256 indexed propertyId,
        uint256 oldBalance,
        uint256 newBalance
    );

    event TransferRecorded(
        address indexed from,
        address indexed to,
        uint256 indexed propertyId,
        uint256 amount,
        uint256 timestamp
    );

    event PropertyDeactivated(uint256 indexed propertyId);

    modifier onlyRegistrar() {
        require(hasRole(REGISTRAR_ROLE, msg.sender), "OwnershipRegistry: caller is not a registrar");
        _;
    }

    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "OwnershipRegistry: caller is not an admin");
        _;
    }

    modifier propertyExists(uint256 propertyId) {
        require(properties[propertyId].propertyId != 0, "OwnershipRegistry: property does not exist");
        _;
    }

    modifier onlyKYCVerified() {
        require(kycRegistry.isVerified(msg.sender), "OwnershipRegistry: KYC verification required");
        _;
    }

    constructor(address _kycRegistry) {
        require(_kycRegistry != address(0), "OwnershipRegistry: invalid KYC registry");

        kycRegistry = IKYCRegistry(_kycRegistry);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(REGISTRAR_ROLE, msg.sender);
    }

    /**
     * @dev Register a new property
     */
    function registerProperty(
        address tokenContract,
        string memory name,
        string memory symbol,
        uint256 totalSupply
    ) external onlyRegistrar whenNotPaused returns (uint256 propertyId) {
        require(tokenContract != address(0), "OwnershipRegistry: invalid token contract");
        require(bytes(name).length > 0, "OwnershipRegistry: empty name");
        require(bytes(symbol).length > 0, "OwnershipRegistry: empty symbol");
        require(totalSupply > 0, "OwnershipRegistry: invalid total supply");

        propertyId = nextPropertyId++;
        totalProperties++;

        properties[propertyId] = PropertyOwnership({
            propertyId: propertyId,
            tokenContract: tokenContract,
            propertyName: name,
            propertySymbol: symbol,
            totalSupply: totalSupply,
            circulatingSupply: 0,
            totalHolders: 0,
            isActive: true,
            createdAt: block.timestamp
        });

        emit PropertyRegistered(propertyId, tokenContract, name, symbol, totalSupply);
    }

    /**
     * @dev Update user ownership for a property
     */
    function updateOwnership(
        address user,
        uint256 propertyId,
        uint256 newBalance
    ) external onlyRegistrar propertyExists(propertyId) whenNotPaused {
        require(user != address(0), "OwnershipRegistry: invalid user address");

        PropertyOwnership storage property = properties[propertyId];
        uint256 oldBalance = 0;
        bool userExists = false;

        // Check if user already has holdings for this property
        if (userPropertyIndex[user][propertyId] != 0) {
            uint256 index = userPropertyIndex[user][propertyId] - 1;
            oldBalance = userHoldings[user][index].balance;
            userExists = true;
        }

        if (newBalance > 0) {
            if (userExists) {
                // Update existing holdings
                uint256 index = userPropertyIndex[user][propertyId] - 1;
                userHoldings[user][index].balance = newBalance;
                userHoldings[user][index].lastTransferTimestamp = block.timestamp;
                userHoldings[user][index].isActive = true;
            } else {
                // Add new holdings
                uint256 index = userHoldings[user].length;
                userHoldings[user].push(UserHoldings({
                    propertyId: propertyId,
                    tokenContract: property.tokenContract,
                    balance: newBalance,
                    purchaseTimestamp: block.timestamp,
                    lastTransferTimestamp: block.timestamp,
                    isActive: true
                }));
                userPropertyIndex[user][propertyId] = index + 1;

                // Add to property holders if not already there
                if (!isPropertyHolder[user][propertyId]) {
                    propertyHolders[propertyId].push(user);
                    isPropertyHolder[user][propertyId] = true;
                    property.totalHolders++;
                }

                if (userHoldings[user].length == 1) {
                    totalUsers++;
                }
            }

            // Update property circulating supply
            property.circulatingSupply = property.circulatingSupply - oldBalance + newBalance;
        } else if (userExists) {
            // Remove holdings
            uint256 index = userPropertyIndex[user][propertyId] - 1;
            userHoldings[user][index].isActive = false;
            userHoldings[user][index].balance = 0;

            // Remove from property holders
            if (isPropertyHolder[user][propertyId]) {
                isPropertyHolder[user][propertyId] = false;
                property.totalHolders--;
            }

            // Update property circulating supply
            property.circulatingSupply -= oldBalance;
        }

        emit OwnershipUpdated(user, propertyId, oldBalance, newBalance);
    }

    /**
     * @dev Record a transfer for analytics
     */
    function recordTransfer(
        address from,
        address to,
        uint256 propertyId,
        uint256 amount,
        string memory transactionHash
    ) external onlyRegistrar propertyExists(propertyId) whenNotPaused {
        require(from != address(0) || to != address(0), "OwnershipRegistry: invalid addresses");
        require(amount > 0, "OwnershipRegistry: invalid amount");

        transferRecords.push(TransferRecord({
            from: from,
            to: to,
            propertyId: propertyId,
            amount: amount,
            timestamp: block.timestamp,
            transactionHash: transactionHash
        }));

        emit TransferRecorded(from, to, propertyId, amount, block.timestamp);
    }

    /**
     * @dev Deactivate a property
     */
    function deactivateProperty(uint256 propertyId) external onlyRegistrar propertyExists(propertyId) {
        properties[propertyId].isActive = false;
        emit PropertyDeactivated(propertyId);
    }

    /**
     * @dev Get property ownership details
     */
    function getPropertyOwnership(uint256 propertyId) external view returns (PropertyOwnership memory) {
        return properties[propertyId];
    }

    /**
     * @dev Get user holdings for all properties
     */
    function getUserHoldings(address user) external view returns (UserHoldings[] memory) {
        return userHoldings[user];
    }

    /**
     * @dev Get user holdings for a specific property
     */
    function getUserPropertyHoldings(address user, uint256 propertyId) external view returns (UserHoldings memory) {
        uint256 index = userPropertyIndex[user][propertyId];
        if (index == 0) {
            return UserHoldings({
                propertyId: propertyId,
                tokenContract: address(0),
                balance: 0,
                purchaseTimestamp: 0,
                lastTransferTimestamp: 0,
                isActive: false
            });
        }
        return userHoldings[user][index - 1];
    }

    /**
     * @dev Get all holders for a property
     */
    function getPropertyHolders(uint256 propertyId) external view returns (address[] memory) {
        return propertyHolders[propertyId];
    }

    /**
     * @dev Get transfer records for a property
     */
    function getPropertyTransfers(uint256 propertyId, uint256 offset, uint256 limit) external view returns (TransferRecord[] memory) {
        uint256 totalRecords = transferRecords.length;
        uint256 start = offset;
        uint256 end = offset + limit;
        
        if (end > totalRecords) {
            end = totalRecords;
        }
        if (start >= totalRecords) {
            return new TransferRecord[](0);
        }

        uint256 resultSize = end - start;
        TransferRecord[] memory result = new TransferRecord[](resultSize);
        uint256 resultIndex = 0;

        for (uint256 i = start; i < end; i++) {
            if (transferRecords[i].propertyId == propertyId) {
                result[resultIndex] = transferRecords[i];
                resultIndex++;
            }
        }

        // Resize array to actual count
        assembly {
            mstore(result, resultIndex)
        }

        return result;
    }

    /**
     * @dev Get all active properties
     */
    function getActiveProperties() external view returns (uint256[] memory) {
        uint256[] memory activeProperties = new uint256[](totalProperties);
        uint256 count = 0;
        
        for (uint256 i = 1; i < nextPropertyId; i++) {
            if (properties[i].isActive) {
                activeProperties[count] = i;
                count++;
            }
        }

        // Resize array to actual count
        assembly {
            mstore(activeProperties, count)
        }

        return activeProperties;
    }

    /**
     * @dev Get platform statistics
     */
    function getPlatformStats() external view returns (
        uint256 totalPropertiesCount,
        uint256 totalUsersCount,
        uint256 totalTransfers,
        uint256 activeProperties
    ) {
        totalPropertiesCount = totalProperties;
        totalUsersCount = totalUsers;
        totalTransfers = transferRecords.length;
        activeProperties = 0;

        for (uint256 i = 1; i < nextPropertyId; i++) {
            if (properties[i].isActive) {
                activeProperties++;
            }
        }
    }

    /**
     * @dev Get user portfolio summary
     */
    function getUserPortfolioSummary(address user) external view returns (
        uint256 totalProperties,
        uint256 totalValue,
        uint256 activeHoldings
    ) {
        UserHoldings[] memory holdings = userHoldings[user];
        totalProperties = 0;
        totalValue = 0;
        activeHoldings = 0;

        for (uint256 i = 0; i < holdings.length; i++) {
            if (holdings[i].isActive && holdings[i].balance > 0) {
                totalProperties++;
                activeHoldings++;
                // Note: totalValue calculation would require price data from external sources
            }
        }
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
     * @dev Grant registrar role to an address
     */
    function grantRegistrarRole(address registrar) external onlyAdmin {
        grantRole(REGISTRAR_ROLE, registrar);
    }

    /**
     * @dev Revoke registrar role from an address
     */
    function revokeRegistrarRole(address registrar) external onlyAdmin {
        revokeRole(REGISTRAR_ROLE, registrar);
    }

    /**
     * @dev Emergency function to recover stuck tokens
     */
    function emergencyRecoverTokens(address token, address to, uint256 amount) external onlyAdmin {
        require(to != address(0), "OwnershipRegistry: invalid recipient");
        require(IERC20(token).transfer(to, amount), "OwnershipRegistry: transfer failed");
    }

    /**
     * @dev Emergency function to recover stuck ETH
     */
    function emergencyRecoverETH(address to) external onlyAdmin {
        require(to != address(0), "OwnershipRegistry: invalid recipient");
        (bool success, ) = to.call{value: address(this).balance}("");
        require(success, "OwnershipRegistry: ETH transfer failed");
    }
}
