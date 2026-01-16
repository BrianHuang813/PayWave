// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MockFHE
 * @notice Mock FHE library for local testing without Zama coprocessor
 * @dev Simulates encrypted operations with plaintext values for testing
 */

// Mock encrypted types - just aliases to uint256 for local testing
type euint64 is uint256;
type euint32 is uint256;
type euint16 is uint256;
type euint8 is uint256;
type ebool is uint256;

// External encrypted input type (simulated)
type externalEuint64 is bytes32;

library MockFHE {
    // ============ Type Conversion ============

    function asEuint64(uint256 value) internal pure returns (euint64) {
        return euint64.wrap(value);
    }

    function asEuint32(uint32 value) internal pure returns (euint32) {
        return euint32.wrap(uint256(value));
    }

    function asEbool(bool value) internal pure returns (ebool) {
        return ebool.wrap(value ? 1 : 0);
    }

    // ============ Arithmetic Operations ============

    function add(euint64 a, euint64 b) internal pure returns (euint64) {
        return euint64.wrap(euint64.unwrap(a) + euint64.unwrap(b));
    }

    function sub(euint64 a, euint64 b) internal pure returns (euint64) {
        uint256 aVal = euint64.unwrap(a);
        uint256 bVal = euint64.unwrap(b);
        // Prevent underflow in mock (real FHE would handle this differently)
        if (bVal > aVal) return euint64.wrap(0);
        return euint64.wrap(aVal - bVal);
    }

    function mul(euint64 a, euint64 b) internal pure returns (euint64) {
        return euint64.wrap(euint64.unwrap(a) * euint64.unwrap(b));
    }

    // ============ Comparison Operations ============

    function ge(euint64 a, euint64 b) internal pure returns (ebool) {
        return ebool.wrap(euint64.unwrap(a) >= euint64.unwrap(b) ? 1 : 0);
    }

    function gt(euint64 a, euint64 b) internal pure returns (ebool) {
        return ebool.wrap(euint64.unwrap(a) > euint64.unwrap(b) ? 1 : 0);
    }

    function le(euint64 a, euint64 b) internal pure returns (ebool) {
        return ebool.wrap(euint64.unwrap(a) <= euint64.unwrap(b) ? 1 : 0);
    }

    function lt(euint64 a, euint64 b) internal pure returns (ebool) {
        return ebool.wrap(euint64.unwrap(a) < euint64.unwrap(b) ? 1 : 0);
    }

    function eq(euint64 a, euint64 b) internal pure returns (ebool) {
        return ebool.wrap(euint64.unwrap(a) == euint64.unwrap(b) ? 1 : 0);
    }

    function ne(euint64 a, euint64 b) internal pure returns (ebool) {
        return ebool.wrap(euint64.unwrap(a) != euint64.unwrap(b) ? 1 : 0);
    }

    // ============ Conditional Selection ============

    function select(ebool condition, euint64 a, euint64 b) internal pure returns (euint64) {
        return ebool.unwrap(condition) == 1 ? a : b;
    }

    // ============ ACL Operations (no-op in mock) ============

    function allowThis(euint64 value) internal pure returns (euint64) {
        return value; // No-op in mock
    }

    function allowThis(ebool value) internal pure returns (ebool) {
        return value; // No-op in mock
    }

    function allow(euint64 value, address) internal pure returns (euint64) {
        return value; // No-op in mock
    }

    function allow(ebool value, address) internal pure returns (ebool) {
        return value; // No-op in mock
    }

    function allowTransient(euint64, address) internal pure {
        // No-op in mock
    }

    function isSenderAllowed(euint64) internal pure returns (bool) {
        return true; // Always allowed in mock
    }

    // ============ Initialization Check ============

    function isInitialized(euint64 value) internal pure returns (bool) {
        // In mock, we consider 0 as uninitialized
        // Note: This is a simplification; real FHE tracks initialization separately
        return euint64.unwrap(value) != 0;
    }

    // ============ External Input Handling ============

    /**
     * @notice Convert external encrypted input to euint64
     * @dev In mock mode, we decode the bytes32 as a simple uint64 value
     */
    function fromExternal(externalEuint64 handle, bytes calldata) internal pure returns (euint64) {
        // In mock, the handle directly contains the value (first 8 bytes)
        return euint64.wrap(uint256(uint64(uint256(externalEuint64.unwrap(handle)))));
    }

    // ============ Decryption (for testing) ============

    /**
     * @notice Decrypt euint64 to plaintext (ONLY FOR TESTING)
     * @dev In real FHE, this would require going through the coprocessor
     */
    function decrypt(euint64 value) internal pure returns (uint64) {
        return uint64(euint64.unwrap(value));
    }

    function decryptBool(ebool value) internal pure returns (bool) {
        return ebool.unwrap(value) == 1;
    }
}

/**
 * @notice Helper to create mock external encrypted handles
 */
library MockEncryptedInput {
    function createHandle(uint64 value) internal pure returns (externalEuint64) {
        return externalEuint64.wrap(bytes32(uint256(value)));
    }
}
