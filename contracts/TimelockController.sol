// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/TimelockController.sol";

/**
 * @title PropertyTimelockController
 * @dev Timelock controller for property governance proposals
 * @dev Inherits from OpenZeppelin's TimelockController
 */
contract PropertyTimelockController is TimelockController {
    /**
     * @dev Constructor
     * @param minDelay Minimum delay for proposal execution
     * @param proposers Array of addresses that can propose
     * @param executors Array of addresses that can execute
     * @param admin Admin address
     */
    constructor(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) TimelockController(minDelay, proposers, executors, admin) {}
}
