// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @notice Mock USDC token for testing purposes
 * @dev 6 decimals to match real USDC
 */
contract MockUSDC is ERC20 {
    uint8 private constant DECIMALS = 6;
    
    constructor() ERC20("Mock USDC", "USDC") {}
    
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }
    
    /**
     * @notice Mint tokens to any address (for testing)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    /**
     * @notice Burn tokens from sender
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
