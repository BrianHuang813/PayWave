// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";
import "@fhevm/solidity/config/ZamaConfig.sol";
import "encrypted-types/EncryptedTypes.sol";
import "./lib/Errors.sol";
import "./cUSDC.sol";
import "./PayrollTreasury.sol";

/**
 * @title Payroll
 * @notice Core payroll contract for confidential salary management
 * @dev Stores encrypted payslips, computes encrypted net pay, executes confidential payments
 *      using official Zama FHEVM SDK
 */
contract Payroll is ZamaEthereumConfig {
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
     * @notice Set encrypted payslip inputs for an employee using encrypted inputs
     * @dev Uses official FHEVM encrypted input format with ZK proof verification
     * @param employee Employee address
     * @param period Period in YYYYMM format
     * @param baseHandle Encrypted base salary handle
     * @param bonusHandle Encrypted bonus handle
     * @param penaltyHandle Encrypted penalty handle
     * @param unpaidLeaveHandle Encrypted unpaid leave deduction handle
     * @param inputProof ZK proof for all encrypted inputs
     * @param policyHash Hash of the policy version used
     */
    function setPayslipInputs(
        address employee,
        uint32 period,
        externalEuint64 baseHandle,
        externalEuint64 bonusHandle,
        externalEuint64 penaltyHandle,
        externalEuint64 unpaidLeaveHandle,
        bytes calldata inputProof,
        bytes32 policyHash
    ) external onlyIssuer validPeriod(period) {
        if (employee == address(0)) revert E_INVALID_ADDRESS();
        
        Payslip storage slip = payslips[employee][period];
        
        // Check if already exists (based on policy, could allow overwrite)
        if (slip.status != PayslipStatus.DRAFT && payslipIds[employee][period] != 0) {
            revert E_ALREADY_SET();
        }
        
        // Verify and convert encrypted inputs using official FHE.fromExternal
        euint64 base = FHE.fromExternal(baseHandle, inputProof);
        euint64 bonus = FHE.fromExternal(bonusHandle, inputProof);
        euint64 penalty = FHE.fromExternal(penaltyHandle, inputProof);
        euint64 unpaidLeave = FHE.fromExternal(unpaidLeaveHandle, inputProof);
        
        // Allow this contract to use the encrypted values
        slip.base = FHE.allowThis(base);
        slip.bonus = FHE.allowThis(bonus);
        slip.penalty = FHE.allowThis(penalty);
        slip.unpaidLeaveDeduct = FHE.allowThis(unpaidLeave);
        
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
     *      Uses FHE.select for confidential branching (no if/else on ebool)
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
        
        // Compute gross = base + bonus (homomorphic addition)
        euint64 gross = FHE.add(slip.base, slip.bonus);
        gross = FHE.allowThis(gross);
        
        // Compute total deductions = penalty + unpaidLeaveDeduct
        euint64 deduct = FHE.add(slip.penalty, slip.unpaidLeaveDeduct);
        deduct = FHE.allowThis(deduct);
        
        // Compute net = select(gross >= deduct, gross - deduct, 0)
        // Using FHE.select for confidential conditional (NOT if/else on ebool)
        ebool isPositive = FHE.ge(gross, deduct);
        isPositive = FHE.allowThis(isPositive);
        
        euint64 difference = FHE.sub(gross, deduct);
        difference = FHE.allowThis(difference);
        
        euint64 zero = FHE.asEuint64(0);
        zero = FHE.allowThis(zero);
        
        // Select: if isPositive then difference else zero
        euint64 net = FHE.select(isPositive, difference, zero);
        slip.net = FHE.allowThis(net);
        
        // Update status
        slip.status = PayslipStatus.COMPUTED;
        slip.computedAt = block.timestamp;
        
        // Grant employee permission to decrypt their payslip details (user decrypt)
        slip.base = FHE.allow(slip.base, employee);
        slip.bonus = FHE.allow(slip.bonus, employee);
        slip.penalty = FHE.allow(slip.penalty, employee);
        slip.unpaidLeaveDeduct = FHE.allow(slip.unpaidLeaveDeduct, employee);
        slip.net = FHE.allow(slip.net, employee);
        
        emit PayslipComputed(employee, period, payslipIds[employee][period]);
    }
    
    /**
     * @notice Execute confidential payment to employee
     * @dev Transfers encrypted net amount from treasury to employee via cUSDC
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
        // This allows cUSDC to verify it has permission within this transaction
        FHE.allowTransient(slip.net, address(token));
        
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
     *      Uses FHE.allow (NOT makePubliclyDecryptable) - only gov can decrypt
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
        
        // Grant government permission to decrypt payslip fields via user decrypt
        // NOT publicly decryptable - only govMultisig can decrypt
        slip.base = FHE.allow(slip.base, govMultisig);
        slip.bonus = FHE.allow(slip.bonus, govMultisig);
        slip.penalty = FHE.allow(slip.penalty, govMultisig);
        slip.unpaidLeaveDeduct = FHE.allow(slip.unpaidLeaveDeduct, govMultisig);
        slip.net = FHE.allow(slip.net, govMultisig);
        
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
     * @notice Get encrypted payslip handles (for frontend user decryption)
     * @dev Anyone can get handles, but only permitted addresses can decrypt
     *      Employee uses userDecrypt flow with EIP-712 signature
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
}
