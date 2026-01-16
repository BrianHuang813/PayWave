// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./MockFHE.sol";
import "../lib/Errors.sol";
import "./MockcUSDC.sol";
import "./MockPayrollTreasury.sol";

/**
 * @title MockPayroll
 * @notice Mock version of Payroll contract for local testing without Zama coprocessor
 * @dev Uses MockFHE library to simulate encrypted operations
 */
contract MockPayroll {
    using MockFHE for euint64;
    using MockFHE for ebool;

    // ============ Enums ============

    enum PayslipStatus {
        DRAFT,      // Inputs set, not computed
        COMPUTED,   // Net calculated, ready to pay
        PAID,       // Payment executed
        VOID        // Cancelled (optional)
    }

    // ============ Structs ============

    struct Payslip {
        euint64 base;
        euint64 bonus;
        euint64 penalty;
        euint64 unpaidLeaveDeduct;
        euint64 net;
        PayslipStatus status;
        bytes32 policyHash;
        uint256 createdAt;
        uint256 computedAt;
        uint256 paidAt;
    }

    // ============ State Variables ============

    address public owner;
    address public issuerMultisig;
    address public govMultisig;
    address public complianceGate;
    MockPayrollTreasury public treasury;
    MockcUSDC public token;

    mapping(address => mapping(uint32 => Payslip)) private payslips;
    uint256 public nextPayslipId;
    mapping(address => mapping(uint32 => uint256)) public payslipIds;

    // ============ Events ============

    event PayslipInputsSet(address indexed employee, uint32 indexed period, bytes32 policyHash, uint256 payslipId);
    event PayslipComputed(address indexed employee, uint32 indexed period, uint256 payslipId);
    event PayslipPaid(address indexed employee, uint32 indexed period, uint256 payslipId, bytes32 paymentRef);
    event GovAccessGranted(address indexed employee, uint32 indexed period, uint256 caseId, address indexed govMultisig);
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

    function setIssuer(address _issuer) external onlyOwner {
        if (_issuer == address(0)) revert E_INVALID_ADDRESS();
        issuerMultisig = _issuer;
        emit IssuerUpdated(_issuer);
    }

    function setGov(address _gov) external onlyOwner {
        if (_gov == address(0)) revert E_INVALID_ADDRESS();
        govMultisig = _gov;
        emit GovUpdated(_gov);
    }

    function setComplianceGate(address _gate) external onlyOwner {
        if (_gate == address(0)) revert E_INVALID_ADDRESS();
        complianceGate = _gate;
        emit GateUpdated(_gate);
    }

    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert E_INVALID_ADDRESS();
        treasury = MockPayrollTreasury(_treasury);
        emit TreasuryUpdated(_treasury);
    }

    function setToken(address _token) external onlyOwner {
        if (_token == address(0)) revert E_INVALID_ADDRESS();
        token = MockcUSDC(_token);
        emit TokenUpdated(_token);
    }

    // ============ Payslip Functions ============

    /**
     * @notice Set payslip inputs using mock encrypted handles
     * @param employee Employee address
     * @param period Period in YYYYMM format
     * @param baseHandle Mock encrypted base salary (just uint64 cast to bytes32)
     * @param bonusHandle Mock encrypted bonus
     * @param penaltyHandle Mock encrypted penalty
     * @param unpaidLeaveHandle Mock encrypted unpaid leave deduction
     * @param policyHash Hash of the policy version
     */
    function setPayslipInputs(
        address employee,
        uint32 period,
        uint64 baseHandle,
        uint64 bonusHandle,
        uint64 penaltyHandle,
        uint64 unpaidLeaveHandle,
        bytes32 policyHash
    ) external onlyIssuer validPeriod(period) {
        if (employee == address(0)) revert E_INVALID_ADDRESS();

        Payslip storage slip = payslips[employee][period];

        if (slip.status != PayslipStatus.DRAFT && payslipIds[employee][period] != 0) {
            revert E_ALREADY_SET();
        }

        // Convert plaintext values to mock encrypted
        slip.base = MockFHE.asEuint64(baseHandle);
        slip.bonus = MockFHE.asEuint64(bonusHandle);
        slip.penalty = MockFHE.asEuint64(penaltyHandle);
        slip.unpaidLeaveDeduct = MockFHE.asEuint64(unpaidLeaveHandle);

        slip.status = PayslipStatus.DRAFT;
        slip.policyHash = policyHash;
        slip.createdAt = block.timestamp;

        uint256 payslipId = nextPayslipId++;
        payslipIds[employee][period] = payslipId;

        emit PayslipInputsSet(employee, period, policyHash, payslipId);
    }

    /**
     * @notice Compute net pay using mock FHE operations
     */
    function computePayslip(
        address employee,
        uint32 period
    ) external onlyIssuer validPeriod(period) {
        Payslip storage slip = payslips[employee][period];

        if (payslipIds[employee][period] == 0) revert E_PAYSLIP_NOT_FOUND();
        if (slip.status != PayslipStatus.DRAFT) revert E_BAD_STATUS();

        // Compute using mock FHE operations
        euint64 gross = MockFHE.add(slip.base, slip.bonus);
        euint64 deduct = MockFHE.add(slip.penalty, slip.unpaidLeaveDeduct);

        ebool isPositive = MockFHE.ge(gross, deduct);
        euint64 difference = MockFHE.sub(gross, deduct);
        euint64 zero = MockFHE.asEuint64(uint64(0));

        slip.net = MockFHE.select(isPositive, difference, zero);

        slip.status = PayslipStatus.COMPUTED;
        slip.computedAt = block.timestamp;

        emit PayslipComputed(employee, period, payslipIds[employee][period]);
    }

    /**
     * @notice Execute payment using mock encrypted transfer
     */
    function pay(
        address employee,
        uint32 period
    ) external onlyIssuer validPeriod(period) {
        Payslip storage slip = payslips[employee][period];

        if (payslipIds[employee][period] == 0) revert E_PAYSLIP_NOT_FOUND();
        if (slip.status != PayslipStatus.COMPUTED) revert E_BAD_STATUS();
        if (slip.status == PayslipStatus.PAID) revert E_ALREADY_PAID();

        // Execute mock encrypted transfer
        token.transferEncryptedFrom(
            address(treasury),
            employee,
            slip.net
        );

        slip.status = PayslipStatus.PAID;
        slip.paidAt = block.timestamp;

        bytes32 paymentRef = keccak256(abi.encodePacked(
            employee,
            period,
            block.timestamp,
            payslipIds[employee][period]
        ));

        emit PayslipPaid(employee, period, payslipIds[employee][period], paymentRef);
    }

    // ============ Break-Glass Function ============

    function grantGovAccess(
        address employee,
        uint32 period,
        uint256 caseId
    ) external onlyGate {
        if (payslipIds[employee][period] == 0) revert E_PAYSLIP_NOT_FOUND();

        // In mock, we just emit the event (ACL is simulated)
        emit GovAccessGranted(employee, period, caseId, govMultisig);
    }

    // ============ View Functions ============

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
     * @notice Get decrypted payslip values (MOCK ONLY - for testing)
     * @dev In production, only authorized users can decrypt via coprocessor
     */
    function getPayslipDecrypted(
        address employee,
        uint32 period
    ) external view returns (
        uint64 base,
        uint64 bonus,
        uint64 penalty,
        uint64 unpaidLeaveDeduct,
        uint64 net
    ) {
        Payslip storage slip = payslips[employee][period];
        return (
            MockFHE.decrypt(slip.base),
            MockFHE.decrypt(slip.bonus),
            MockFHE.decrypt(slip.penalty),
            MockFHE.decrypt(slip.unpaidLeaveDeduct),
            MockFHE.decrypt(slip.net)
        );
    }
}
