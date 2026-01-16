// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./MockcUSDC.sol";
import "../lib/Errors.sol";

/**
 * @title MockUSDCWrapper
 * @notice Mock version of USDCWrapper for local testing
 * @dev Uses MockcUSDC instead of the real cUSDC
 */
contract MockUSDCWrapper {
    using SafeERC20 for IERC20;

    // ============ State Variables ============

    IERC20 public immutable usdc;
    MockcUSDC public immutable cusdc;

    // ============ Events ============

    event Deposited(address indexed depositor, uint256 amount, address indexed recipient);
    event Withdrawn(address indexed withdrawer, uint256 amount, address indexed recipient);

    // ============ Constructor ============

    constructor(address _usdc, address _cusdc) {
        if (_usdc == address(0) || _cusdc == address(0)) revert E_INVALID_ADDRESS();
        usdc = IERC20(_usdc);
        cusdc = MockcUSDC(_cusdc);
    }

    // ============ External Functions ============

    function deposit(uint256 amount, address recipient) external {
        if (amount == 0) revert E_INVALID_AMOUNT();
        if (recipient == address(0)) revert E_INVALID_ADDRESS();

        usdc.safeTransferFrom(msg.sender, address(this), amount);
        cusdc.mint(recipient, amount);

        emit Deposited(msg.sender, amount, recipient);
    }

    function withdraw(uint256 amount, address recipient) external {
        if (amount == 0) revert E_INVALID_AMOUNT();
        if (recipient == address(0)) revert E_INVALID_ADDRESS();

        cusdc.burn(msg.sender, amount);
        usdc.safeTransfer(recipient, amount);

        emit Withdrawn(msg.sender, amount, recipient);
    }

    // ============ View Functions ============

    function totalLocked() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }
}
