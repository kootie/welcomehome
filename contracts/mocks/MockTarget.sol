// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockTarget
 * @dev Mock target contract for testing transaction execution
 */
contract MockTarget {
    uint256 public value;
    string public data;
    
    event ValueSet(uint256 newValue);
    event DataSet(string newData);
    event Received(address sender, uint256 amount);

    /**
     * @dev Set a value
     * @param _value Value to set
     */
    function setValue(uint256 _value) external {
        value = _value;
        emit ValueSet(_value);
    }

    /**
     * @dev Set data
     * @param _data Data to set
     */
    function setData(string memory _data) external {
        data = _data;
        emit DataSet(_data);
    }

    /**
     * @dev Simple function that always succeeds
     */
    function succeed() external pure returns (bool) {
        return true;
    }

    /**
     * @dev Function that always reverts
     */
    function fail() external pure {
        revert("MockTarget: This function always fails");
    }

    /**
     * @dev Function that requires ETH
     */
    function requireEth() external payable {
        require(msg.value > 0, "MockTarget: Requires ETH");
        emit Received(msg.sender, msg.value);
    }

    /**
     * @dev Function that uses gas
     * @param iterations Number of iterations to perform
     */
    function useGas(uint256 iterations) external pure returns (uint256) {
        uint256 result = 0;
        for (uint256 i = 0; i < iterations; i++) {
            result += i;
        }
        return result;
    }

    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    /**
     * @dev Fallback function
     */
    fallback() external payable {
        emit Received(msg.sender, msg.value);
    }
}
