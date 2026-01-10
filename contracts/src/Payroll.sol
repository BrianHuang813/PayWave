// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./lib/FHEVM.sol";
import "./lib/Errors.sol";
import "./cUSDC.sol";
import "./PayrollTreasury.sol";

/**
 * @title Payroll
 * @notice Core payroll contract for confidential salary management
 * @dev Stores encrypted payslips, computes encrypted net pay, executes confidential payments
 */
contract Payroll {
    using FHEVM for *;
    
    // ============ Enums ============
    
    enum PayslipStatus {
        DRAFT,      // Inputs set, not computed
        COMPUTED,   // Net calculated, ready to pay
        PAID,       // Payment executed
        VOID        // Cancelled (optional)
    }
    
    // ============ Structs ============
    
    /**
     * @notice Payslip data structure with encrypted salary fields
     * @dev All monetary values are encrypted; status and metadata are public
     */
    struct Payslip {
        // Encrypted fields (only authorized can decrypt)
        euint64 base;               // Base salary
        euint64 bonus;              // Bonus amount
        euint64 penalty;            // Penalty deductions
        euint64 unpaidLeaveDeduct;  // Unpaid leave deductions
        euint64 net;                // Computed net pay
        
        // Public metadata
        PayslipStatus status;
        bytes32 policyHash;         // Hash of policy version for audit
        uint256 createdAt;
        uint256 computedAt;
        uint256 paidAt;
    }
    
    // ============ State Variables ============
    
    /// @notice Contract owner
    address public owner;
    
    /// @notice Issuer multisig (HR/Finance)
    address public issuerMultisig;
    
    /// @notice Government multisig
    address public govMultisig;
    
    /// @notice ComplianceGate contract
    address public complianceGate;
    
    /// @notice PayrollTreasury contract
    PayrollTreasury public treasury;
    
    /// @notice cUSDC token contract
    cUSDC public token;
    
    /// @notice Payslip storage: employee => period => Payslip
    mapping(address => mapping(uint32 => Payslip)) private payslips;
    
    /// @notice Payslip ID counter
    uint256 public nextPayslipId;
    
    /// @notice Payslip ID mapping: employee => period => payslipId
    mapping(address => mapping(uint32 => uint256)) public payslipIds;
    
    // ============ Events ============
    
    /// @notice Emitted when payslip inputs are set
    /// @dev Does NOT include any salary amounts (confidential)
    event PayslipInputsSet(
        address indexed employee,
        uint32 indexed period,
        bytes32 policyHash,
        uint256 payslipId
    );
    
    /// @notice Emitted when payslip net is computed
    event PayslipComputed(
        address indexed employee,
        uint32 indexed period,
        uint256 payslipId
    );
    
    /// @notice Emitted when payment is executed
    /// @dev Does NOT include payment amount (confidential)
    event PayslipPaid(
        address indexed employee,
        uint32 indexed period,
        uint256 payslipId,
        bytes32 paymentRef
    );
    
    /// @notice Emitted when government is granted access to a payslip
    event GovAccessGranted(
        address indexed employee,
        uint32 indexed period,
        uint256 caseId,
        address indexed govMultisig
    );
    
    /// @notice Admin configuration events
    event IssuerUpdated(address indexed newIssuer);
    event GovUpdated(address indexed newGov);
    event GateUpdated(address indexed newGate);
    event TreasuryUpdated(address indexed newTreasury);
    event TokenUpdated(address indexed newToken);
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert E_NOT_OWNER();
        _;
    }
    
    modifier onlyIssuer() {
        if (msg.sender != issuerMultisig) revert E_NOT_ISSUER();
        _;
    }
    
    modifier onlyGate() {
        if (msg.sender != complianceGate) revert E_NOT_GATE();
        _;
    }
    
    modifier validPeriod(uint32 period) {
        // Period format: YYYYMM (e.g., 202601)
        uint32 year = period / 100;
        uint32 month = period % 100;
        if (year < 2020 || year > 2100 || month < 1 || month > 12) {
            revert E_INVALID_PERIOD();
        }
        _;
    }
    
    // ============ Constructor ============
    
    constructor() {
        owner = msg.sender;
        nextPayslipId = 1;
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Set issuer multisig address
     */
    function setIssuer(address _issuer) external onlyOwner {
        if (_issuer == address(0)) revert E_INVALID_ADDRESS();
        issuerMultisig = _issuer;
        emit IssuerUpdated(_issuer);
    }
    
    /**
     * @notice Set government multisig address
     */
    function setGov(address _gov) external onlyOwner {
        if (_gov == address(0)) revert E_INVALID_ADDRESS();
        govMultisig = _gov;
        emit GovUpdated(_gov);
    }
    
    /**
     * @notice Set ComplianceGate contract address
     */
    function setComplianceGate(address _gate) external onlyOwner {
        if (_gate == address(0)) revert E_INVALID_ADDRESS();
        complianceGate = _gate;
        emit GateUpdated(_gate);
    }
    
    /**
     * @notice Set Treasury contract address
     */
    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert E_INVALID_ADDRESS();
        treasury = PayrollTreasury(_treasury);
        emit TreasuryUpdated(_treasury);
    }
    
    /**
     * @notice Set cUSDC token address
     */
    function setToken(address _token) external onlyOwner {
        if (_token == address(0)) revert E_INVALID_ADDRESS();
        token = cUSDC(_token);
        emit TokenUpdated(_token);
    }
    
    // ============ Payslip Functions ============
    
    /**
     * @notice Set encrypted payslip inputs for an employee
     * @param employee Employee address
     * @param period Period in YYYYMM format
     * @param packedCiphertext Encrypted salary components (base, bonus, penalty, unpaidLeaveDeduct)
     * @param inputProof ZK proof for the ciphertext
     * @param policyHash Hash of the policy version used
     */
    function setPayslipInputs(
        address employee,
        uint32 period,
        bytes calldata packedCiphertext,
        bytes calldata inputProof,
        bytes32 policyHash
    ) external onlyIssuer validPeriod(period) {
        if (employee == address(0)) revert E_INVALID_ADDRESS();
        
        Payslip storage slip = payslips[employee][period];
        
        // Check if already exists (based on policy, could allow overwrite)
        if (slip.status != PayslipStatus.DRAFT && payslipIds[employee][period] != 0) {
            revert E_ALREADY_SET();
        }
        
        // Parse packed ciphertext into 4 encrypted values
        // Format: [base_ct, bonus_ct, penalty_ct, unpaidLeave_ct] each as bytes
        (
            euint64 base,
            euint64 bonus,
            euint64 penalty,
            euint64 unpaidLeave
        ) = _parsePackedCiphertext(packedCiphertext, inputProof);
        
        // Store encrypted values
        slip.base = base;
        slip.bonus = bonus;
        slip.penalty = penalty;
        slip.unpaidLeaveDeduct = unpaidLeave;
        slip.status = PayslipStatus.DRAFT;
        slip.policyHash = policyHash;
        slip.createdAt = block.timestamp;
        
        // Assign payslip ID
        uint256 payslipId = nextPayslipId++;
        payslipIds[employee][period] = payslipId;
        
        emit PayslipInputsSet(employee, period, policyHash, payslipId);
    }
    
    /**
     * @notice Compute net pay from encrypted inputs
     * @dev gross = base + bonus; deduct = penalty + unpaidLeaveDeduct; net = max(gross - deduct, 0)
     * @param employee Employee address
     * @param period Period in YYYYMM format
     */
    function computePayslip(
        address employee,
        uint32 period
    ) external onlyIssuer validPeriod(period) {
        Payslip storage slip = payslips[employee][period];
        
        if (payslipIds[employee][period] == 0) revert E_PAYSLIP_NOT_FOUND();
        if (slip.status != PayslipStatus.DRAFT) revert E_BAD_STATUS();
        
        // Compute gross = base + bonus
        euint64 gross = FHEVM.add(slip.base, slip.bonus);
        
        // Compute total deductions = penalty + unpaidLeaveDeduct
        euint64 deduct = FHEVM.add(slip.penalty, slip.unpaidLeaveDeduct);
        
        // Compute net = select(gross >= deduct, gross - deduct, 0)
        ebool isPositive = FHEVM.gte(gross, deduct);
        euint64 difference = FHEVM.sub(gross, deduct);
        slip.net = FHEVM.select(isPositive, difference, FHEVM.zero());
        
        // Update status
        slip.status = PayslipStatus.COMPUTED;
        slip.computedAt = block.timestamp;
        
        // Grant employee permission to decrypt their payslip details
        ACL.allow(slip.base, employee);
        ACL.allow(slip.bonus, employee);
        ACL.allow(slip.penalty, employee);
        ACL.allow(slip.unpaidLeaveDeduct, employee);
        ACL.allow(slip.net, employee);
        
        // Also allow this contract to continue using net for payment
        ACL.allow(slip.net, address(this));
        
        emit PayslipComputed(employee, period, payslipIds[employee][period]);
    }
    
    /**
     * @notice Execute confidential payment to employee
     * @param employee Employee address
     * @param period Period in YYYYMM format
     */
    function pay(
        address employee,
        uint32 period
    ) external onlyIssuer validPeriod(period) {
        Payslip storage slip = payslips[employee][period];
        
        if (payslipIds[employee][period] == 0) revert E_PAYSLIP_NOT_FOUND();
        if (slip.status != PayslipStatus.COMPUTED) revert E_BAD_STATUS();
        if (slip.status == PayslipStatus.PAID) revert E_ALREADY_PAID();
        
        // Grant transient access to cUSDC contract to use the net amount
        ACL.allowTransient(slip.net, address(token));
        
        // Execute encrypted transfer from treasury to employee
        token.transferEncryptedFrom(
            address(treasury),
            employee,
            slip.net
        );
        
        // Update status
        slip.status = PayslipStatus.PAID;
        slip.paidAt = block.timestamp;
        
        // Generate payment reference (for audit trail, no amounts)
        bytes32 paymentRef = keccak256(abi.encodePacked(
            employee,
            period,
            block.timestamp,
            payslipIds[employee][period]
        ));
        
        emit PayslipPaid(employee, period, payslipIds[employee][period], paymentRef);
    }
    
    // ============ Break-Glass Function (Gate Only) ============
    
    /**
     * @notice Grant government access to decrypt a specific payslip
     * @dev Can ONLY be called by ComplianceGate after dual approval + timelock
     * @param employee Employee address
     * @param period Period in YYYYMM format
     * @param caseId Compliance case ID for audit
     */
    function grantGovAccess(
        address employee,
        uint32 period,
        uint256 caseId
    ) external onlyGate {
        Payslip storage slip = payslips[employee][period];
        
        if (payslipIds[employee][period] == 0) revert E_PAYSLIP_NOT_FOUND();
        
        // Grant government permission to decrypt payslip fields
        // NOT publicly decryptable - only govMultisig can decrypt
        ACL.allow(slip.base, govMultisig);
        ACL.allow(slip.bonus, govMultisig);
        ACL.allow(slip.penalty, govMultisig);
        ACL.allow(slip.unpaidLeaveDeduct, govMultisig);
        ACL.allow(slip.net, govMultisig);
        
        emit GovAccessGranted(employee, period, caseId, govMultisig);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get payslip metadata (public info only)
     */
    function getPayslipMeta(
        address employee,
        uint32 period
    ) external view returns (
        PayslipStatus status,
        bytes32 policyHash,
        uint256 payslipId,
        uint256 createdAt,
        uint256 computedAt,
        uint256 paidAt
    ) {
        Payslip storage slip = payslips[employee][period];
        return (
            slip.status,
            slip.policyHash,
            payslipIds[employee][period],
            slip.createdAt,
            slip.computedAt,
            slip.paidAt
        );
    }
    
    /**
     * @notice Get encrypted payslip handles (for frontend decryption)
     * @dev Anyone can get handles, but only permitted addresses can decrypt
     */
    function getPayslipCipher(
        address employee,
        uint32 period
    ) external view returns (
        euint64 base,
        euint64 bonus,
        euint64 penalty,
        euint64 unpaidLeaveDeduct,
        euint64 net
    ) {
        Payslip storage slip = payslips[employee][period];
        return (
            slip.base,
            slip.bonus,
            slip.penalty,
            slip.unpaidLeaveDeduct,
            slip.net
        );
    }
    
    // ============ Internal Functions ============
    
    /**
     * @notice Parse packed ciphertext into individual encrypted values
     * @dev In production, this would properly parse and verify the FHEVM ciphertext format
     */
    function _parsePackedCiphertext(
        bytes calldata packedCiphertext,
        bytes calldata inputProof
    ) internal pure returns (
        euint64 base,
        euint64 bonus,
        euint64 penalty,
        euint64 unpaidLeave
    ) {
        // MVP: Create deterministic handles from the packed input
        // In production: Use FHEVM library to properly parse ciphertexts
        
        bytes32 seed = keccak256(abi.encodePacked(packedCiphertext, inputProof));
        
        base = euint64.wrap(uint256(keccak256(abi.encodePacked(seed, "base"))));
        bonus = euint64.wrap(uint256(keccak256(abi.encodePacked(seed, "bonus"))));
        penalty = euint64.wrap(uint256(keccak256(abi.encodePacked(seed, "penalty"))));
        unpaidLeave = euint64.wrap(uint256(keccak256(abi.encodePacked(seed, "unpaidLeave"))));
    }
}
