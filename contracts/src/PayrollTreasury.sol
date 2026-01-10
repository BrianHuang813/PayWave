// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./lib/Errors.sol";

/**
 * @title PayrollTreasury
 * @notice Holds cUSDC funds for payroll disbursements
 * @dev Only Payroll contract can initiate transfers from treasury
 */
contract PayrollTreasury {
    // ============ State Variables ============
    
    /// @notice Contract owner (issuer multisig)
    address public owner;
    
    /// @notice Authorized Payroll contract
    address public payroll;
    
    /// @notice cUSDC token address
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
    
    /**
     * @notice Set the authorized Payroll contract
     * @param _payroll Address of Payroll contract
     */
    function setPayroll(address _payroll) external onlyOwner {
        if (_payroll == address(0)) revert E_INVALID_ADDRESS();
        payroll = _payroll;
        emit PayrollUpdated(_payroll);
    }
    
    /**
     * @notice Set the cUSDC token address
     * @param _cusdc Address of cUSDC token
     */
    function setToken(address _cusdc) external onlyOwner {
        if (_cusdc == address(0)) revert E_INVALID_ADDRESS();
        cusdc = _cusdc;
        emit TokenUpdated(_cusdc);
    }
    
    /**
     * @notice Transfer ownership
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert E_INVALID_ADDRESS();
        owner = newOwner;
        emit OwnerUpdated(newOwner);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get treasury address (for Payroll to use as 'from' address)
     * @return This contract's address
     */
    function getTreasuryAddress() external view returns (address) {
        return address(this);
    }
}
