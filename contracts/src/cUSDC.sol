// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./lib/FHEVM.sol";
import "./lib/Errors.sol";

/**
 * @title cUSDC - Confidential USDC
 * @notice Encrypted ERC20-like token with confidential balances and transfer amounts
 * @dev Implements FHEVM encrypted operations for private balance tracking
 */
contract cUSDC {
    using FHEVM for *;
    
    // ============ State Variables ============
    
    string public constant name = "Confidential USDC";
    string public constant symbol = "cUSDC";
    uint8 public constant decimals = 6;
    
    /// @notice Wrapper contract that can mint/burn
    address public wrapper;
    
    /// @notice Payroll contract that can do encrypted transfers
    address public payroll;
    
    /// @notice Contract owner
    address public owner;
    
    /// @notice Encrypted balances mapping
    mapping(address => euint64) private _encryptedBalances;
    
    /// @notice Total supply (public, since deposits/withdrawals are public)
    uint256 public totalSupply;
    
    // ============ Events ============
    
    event EncryptedTransfer(address indexed from, address indexed to);
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);
    event WrapperUpdated(address indexed newWrapper);
    event PayrollUpdated(address indexed newPayroll);
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert E_NOT_OWNER();
        _;
    }
    
    modifier onlyWrapper() {
        if (msg.sender != wrapper) revert E_NOT_WRAPPER();
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
     * @notice Set the wrapper contract address
     * @param _wrapper Address of USDCWrapper contract
     */
    function setWrapper(address _wrapper) external onlyOwner {
        if (_wrapper == address(0)) revert E_INVALID_ADDRESS();
        wrapper = _wrapper;
        emit WrapperUpdated(_wrapper);
    }
    
    /**
     * @notice Set the payroll contract address
     * @param _payroll Address of Payroll contract
     */
    function setPayroll(address _payroll) external onlyOwner {
        if (_payroll == address(0)) revert E_INVALID_ADDRESS();
        payroll = _payroll;
        emit PayrollUpdated(_payroll);
    }
    
    // ============ Wrapper Functions (Public Amount) ============
    
    /**
     * @notice Mint cUSDC to an address (called by wrapper during deposit)
     * @dev Amount is public since deposits are public
     * @param to Recipient address
     * @param amount Amount to mint (public)
     */
    function mint(address to, uint256 amount) external onlyWrapper {
        if (to == address(0)) revert E_INVALID_ADDRESS();
        if (amount == 0) revert E_INVALID_AMOUNT();
        
        // Convert public amount to encrypted and add to balance
        euint64 encryptedAmount = FHEVM.asEuint64(uint64(amount));
        
        if (FHEVM.isInitialized(_encryptedBalances[to])) {
            _encryptedBalances[to] = FHEVM.add(_encryptedBalances[to], encryptedAmount);
        } else {
            _encryptedBalances[to] = encryptedAmount;
        }
        
        // Grant decrypt permission to owner
        ACL.allow(_encryptedBalances[to], to);
        
        totalSupply += amount;
        emit Mint(to, amount);
    }
    
    /**
     * @notice Burn cUSDC from an address (called by wrapper during withdrawal)
     * @dev Amount is public since withdrawals are public
     * @param from Address to burn from
     * @param amount Amount to burn (public)
     */
    function burn(address from, uint256 amount) external onlyWrapper {
        if (from == address(0)) revert E_INVALID_ADDRESS();
        if (amount == 0) revert E_INVALID_AMOUNT();
        
        // Subtract from encrypted balance
        euint64 encryptedAmount = FHEVM.asEuint64(uint64(amount));
        _encryptedBalances[from] = FHEVM.sub(_encryptedBalances[from], encryptedAmount);
        
        totalSupply -= amount;
        emit Burn(from, amount);
    }
    
    // ============ Payroll Functions (Encrypted Amount) ============
    
    /**
     * @notice Transfer encrypted amount from treasury to employee
     * @dev Amount is encrypted - only source and destination can decrypt
     * @param from Treasury address
     * @param to Employee address
     * @param amountHandle Encrypted amount handle (from Payroll computed net)
     */
    function transferEncryptedFrom(
        address from,
        address to,
        euint64 amountHandle
    ) external onlyPayroll {
        if (from == address(0) || to == address(0)) revert E_INVALID_ADDRESS();
        
        // Verify payroll has transient access to the amount
        require(ACL.isAllowed(amountHandle, msg.sender), "No access to amount");
        
        // Subtract from sender's balance
        _encryptedBalances[from] = FHEVM.sub(_encryptedBalances[from], amountHandle);
        
        // Add to recipient's balance
        if (FHEVM.isInitialized(_encryptedBalances[to])) {
            _encryptedBalances[to] = FHEVM.add(_encryptedBalances[to], amountHandle);
        } else {
            _encryptedBalances[to] = amountHandle;
        }
        
        // Grant decrypt permission to recipient for their new balance
        ACL.allow(_encryptedBalances[to], to);
        
        // Clear transient permission
        ACL.clearTransient(amountHandle, msg.sender);
        
        // Emit event WITHOUT amount (confidential)
        emit EncryptedTransfer(from, to);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get encrypted balance handle for an address
     * @dev Anyone can get the handle, but only permitted addresses can decrypt
     * @param account Address to query
     * @return Encrypted balance handle
     */
    function balanceOfCipher(address account) external view returns (euint64) {
        return _encryptedBalances[account];
    }
    
    /**
     * @notice Check if an address has an initialized balance
     */
    function hasBalance(address account) external view returns (bool) {
        return FHEVM.isInitialized(_encryptedBalances[account]);
    }
}
