// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IFHEVM
 * @notice Interface abstractions for FHEVM encrypted types and operations
 * @dev In production, replace with actual fhevm library imports
 *      This interface models the encrypted operations we need
 */

// Encrypted unsigned integer type (handle)
type euint64 is uint256;
type ebool is uint256;

/**
 * @title FHEVM
 * @notice Library for FHE operations - simulates Zama FHEVM functionality
 * @dev MVP: Uses mock implementation. In production, import from fhevm library
 */
library FHEVM {
    // Mock storage for encrypted values (in real FHEVM, these are handles to ciphertexts)
    
    /**
     * @notice Create an encrypted uint64 from plaintext (for testing/mock)
     */
    function asEuint64(uint64 value) internal pure returns (euint64) {
        return euint64.wrap(uint256(value));
    }
    
    /**
     * @notice Create encrypted uint64 from ciphertext input
     */
    function asEuint64(bytes memory ciphertext, bytes memory proof) internal pure returns (euint64) {
        // In production: verify proof and create handle
        // Mock: hash the ciphertext to create a deterministic handle
        return euint64.wrap(uint256(keccak256(abi.encodePacked(ciphertext, proof))));
    }
    
    /**
     * @notice Add two encrypted values
     */
    function add(euint64 a, euint64 b) internal pure returns (euint64) {
        // Mock: combine handles (in production: homomorphic addition)
        return euint64.wrap(euint64.unwrap(a) + euint64.unwrap(b));
    }
    
    /**
     * @notice Subtract two encrypted values
     */
    function sub(euint64 a, euint64 b) internal pure returns (euint64) {
        // Mock: combine handles
        uint256 aVal = euint64.unwrap(a);
        uint256 bVal = euint64.unwrap(b);
        return euint64.wrap(aVal > bVal ? aVal - bVal : 0);
    }
    
    /**
     * @notice Compare if a >= b (encrypted comparison)
     */
    function gte(euint64 a, euint64 b) internal pure returns (ebool) {
        return ebool.wrap(euint64.unwrap(a) >= euint64.unwrap(b) ? 1 : 0);
    }
    
    /**
     * @notice Conditional select: if cond then a else b
     */
    function select(ebool cond, euint64 a, euint64 b) internal pure returns (euint64) {
        return ebool.unwrap(cond) == 1 ? a : b;
    }
    
    /**
     * @notice Create encrypted zero
     */
    function zero() internal pure returns (euint64) {
        return euint64.wrap(0);
    }
    
    /**
     * @notice Check if handle is non-zero (exists)
     */
    function isInitialized(euint64 handle) internal pure returns (bool) {
        return euint64.unwrap(handle) != 0;
    }
}

/**
 * @title ACL
 * @notice Access Control List for encrypted values
 * @dev Manages who can decrypt which ciphertext handles
 */
library ACL {
    // Events
    event AccessGranted(euint64 indexed handle, address indexed allowedAddress);
    event TransientAccessGranted(euint64 indexed handle, address indexed contractAddress);
    
    // Storage slot for ACL mappings (handle => address => allowed)
    bytes32 private constant ACL_STORAGE_SLOT = keccak256("paywave.acl.storage");
    
    struct ACLStorage {
        mapping(uint256 => mapping(address => bool)) permissions;
        mapping(uint256 => mapping(address => bool)) transientPermissions;
    }
    
    function _getStorage() private pure returns (ACLStorage storage s) {
        bytes32 slot = ACL_STORAGE_SLOT;
        assembly {
            s.slot := slot
        }
    }
    
    /**
     * @notice Grant permanent decrypt permission for a handle to an address
     * @param handle The encrypted value handle
     * @param allowedAddress The address to grant permission to
     */
    function allow(euint64 handle, address allowedAddress) internal {
        ACLStorage storage s = _getStorage();
        s.permissions[euint64.unwrap(handle)][allowedAddress] = true;
        emit AccessGranted(handle, allowedAddress);
    }
    
    /**
     * @notice Grant transient (single-use) permission for contract operations
     * @param handle The encrypted value handle
     * @param contractAddress The contract to grant transient permission
     */
    function allowTransient(euint64 handle, address contractAddress) internal {
        ACLStorage storage s = _getStorage();
        s.transientPermissions[euint64.unwrap(handle)][contractAddress] = true;
        emit TransientAccessGranted(handle, contractAddress);
    }
    
    /**
     * @notice Check if an address has permission to decrypt a handle
     */
    function isAllowed(euint64 handle, address addr) internal view returns (bool) {
        ACLStorage storage s = _getStorage();
        return s.permissions[euint64.unwrap(handle)][addr] || 
               s.transientPermissions[euint64.unwrap(handle)][addr];
    }
    
    /**
     * @notice Clear transient permission after use
     */
    function clearTransient(euint64 handle, address contractAddress) internal {
        ACLStorage storage s = _getStorage();
        s.transientPermissions[euint64.unwrap(handle)][contractAddress] = false;
    }
}
