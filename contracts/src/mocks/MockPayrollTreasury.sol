// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../lib/Errors.sol";

/**
 * @title MockPayrollTreasury
 * @notice Mock version of PayrollTreasury for local testing
 * @dev Identical to the real version since Treasury doesn't use FHE directly
 */
contract MockPayrollTreasury {
    // ============ State Variables ============

    address public owner;
    address public payroll;
    address public cusdc;

    // ============ Events ============

    event PayrollUpdated(address indexed newPayroll);
    event TokenUpdated(address indexed newToken);
    event OwnerUpdated(address indexed newOwner);

    // ============ Modifiers ============

    modifier onlyOwner() {
        if (msg.sender != owner) revert E_NOT_OWNER();
        _;
    }

    modifier onlyPayroll() {
        if (msg.sender != payroll) revert E_NOT_PAYROLL();
        _;
    }

    // ============ Constructor ============

    constructor() {
        owner = msg.sender;
    }

    // ============ Admin Functions ============

    function setPayroll(address _payroll) external onlyOwner {
        if (_payroll == address(0)) revert E_INVALID_ADDRESS();
        payroll = _payroll;
        emit PayrollUpdated(_payroll);
    }

    function setToken(address _cusdc) external onlyOwner {
        if (_cusdc == address(0)) revert E_INVALID_ADDRESS();
        cusdc = _cusdc;
        emit TokenUpdated(_cusdc);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert E_INVALID_ADDRESS();
        owner = newOwner;
        emit OwnerUpdated(newOwner);
    }

    // ============ View Functions ============

    function getTreasuryAddress() external view returns (address) {
        return address(this);
    }
}
