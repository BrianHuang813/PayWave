// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./cUSDC.sol";
import "./lib/Errors.sol";

/**
 * @title USDCWrapper
 * @notice Wraps public USDC into confidential cUSDC and vice versa
 * @dev Deposit/withdraw amounts are PUBLIC, but payroll distributions are CONFIDENTIAL
 */
contract USDCWrapper {
    using SafeERC20 for IERC20;
    
    // ============ State Variables ============
    
    /// @notice The underlying USDC token
    IERC20 public immutable usdc;
    
    /// @notice The confidential cUSDC token
    cUSDC public immutable cusdc;
    
    // ============ Events ============
    
    /// @notice Emitted when USDC is deposited and cUSDC is minted
    /// @dev Amount is PUBLIC (deposit amounts are visible)
    event Deposited(
        address indexed depositor,
        uint256 amount,
        address indexed recipient
    );
    
    /// @notice Emitted when cUSDC is burned and USDC is withdrawn
    /// @dev Amount is PUBLIC (withdrawal amounts are visible)
    event Withdrawn(
        address indexed withdrawer,
        uint256 amount,
        address indexed recipient
    );
    
    // ============ Constructor ============
    
    /**
     * @notice Initialize wrapper with USDC and cUSDC addresses
     * @param _usdc Address of USDC token
     * @param _cusdc Address of cUSDC token
     */
    constructor(address _usdc, address _cusdc) {
        if (_usdc == address(0) || _cusdc == address(0)) revert E_INVALID_ADDRESS();
        usdc = IERC20(_usdc);
        cusdc = cUSDC(_cusdc);
    }
    
    // ============ External Functions ============
    
    /**
     * @notice Deposit USDC and mint equivalent cUSDC to recipient
     * @dev Caller must have approved this contract to spend USDC
     * @param amount Amount of USDC to deposit (public)
     * @param recipient Address to receive cUSDC (usually PayrollTreasury)
     */
    function deposit(uint256 amount, address recipient) external {
        if (amount == 0) revert E_INVALID_AMOUNT();
        if (recipient == address(0)) revert E_INVALID_ADDRESS();
        
        // Transfer USDC from caller to this contract
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        
        // Mint equivalent cUSDC to recipient
        cusdc.mint(recipient, amount);
        
        emit Deposited(msg.sender, amount, recipient);
    }
    
    /**
     * @notice Burn cUSDC and withdraw equivalent USDC to recipient
     * @dev Caller's cUSDC balance must be sufficient (will be checked in burn)
     * @param amount Amount to withdraw (public)
     * @param recipient Address to receive USDC
     */
    function withdraw(uint256 amount, address recipient) external {
        if (amount == 0) revert E_INVALID_AMOUNT();
        if (recipient == address(0)) revert E_INVALID_ADDRESS();
        
        // Burn cUSDC from caller
        cusdc.burn(msg.sender, amount);
        
        // Transfer USDC to recipient
        usdc.safeTransfer(recipient, amount);
        
        emit Withdrawn(msg.sender, amount, recipient);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get the USDC balance held by this wrapper
     * @return Total USDC locked in the wrapper
     */
    function totalLocked() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }
}
