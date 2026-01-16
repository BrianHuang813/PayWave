// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../lib/Errors.sol";
import "./MockPayroll.sol";

/**
 * @title MockComplianceGate
 * @notice Mock version of ComplianceGate for local testing
 * @dev Uses MockPayroll instead of the real Payroll
 */
contract MockComplianceGate {
    // ============ Constants ============

    uint256 public constant TIMELOCK_DURATION = 24 hours;

    // ============ Structs ============

    struct Case {
        address employee;
        uint32 period;
        bytes32 reasonHash;
        string evidenceURI;
        bool issuerApproved;
        bool govApproved;
        uint256 createdAt;
        uint256 unlockTime;
        bool executed;
    }

    // ============ State Variables ============

    address public owner;
    address public issuerMultisig;
    address public govMultisig;
    MockPayroll public payroll;

    uint256 public nextCaseId;
    mapping(uint256 => Case) public cases;

    // ============ Events ============

    event CaseRequested(
        uint256 indexed caseId,
        address indexed employee,
        uint32 indexed period,
        bytes32 reasonHash,
        string evidenceURI,
        uint256 unlockTime
    );
    event CaseApproved(uint256 indexed caseId, string approverType);
    event CaseExecuted(
        uint256 indexed caseId,
        address indexed employee,
        uint32 indexed period,
        address govMultisig
    );
    event IssuerUpdated(address indexed newIssuer);
    event GovUpdated(address indexed newGov);
    event PayrollUpdated(address indexed newPayroll);

    // ============ Modifiers ============

    modifier onlyOwner() {
        if (msg.sender != owner) revert E_NOT_OWNER();
        _;
    }

    modifier onlyIssuer() {
        if (msg.sender != issuerMultisig) revert E_NOT_ISSUER();
        _;
    }

    modifier onlyGov() {
        if (msg.sender != govMultisig) revert E_NOT_GOV();
        _;
    }

    modifier caseExists(uint256 caseId) {
        if (caseId >= nextCaseId || cases[caseId].createdAt == 0) {
            revert E_CASE_NOT_FOUND();
        }
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
        nextCaseId = 1;
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

    function setPayroll(address _payroll) external onlyOwner {
        if (_payroll == address(0)) revert E_INVALID_ADDRESS();
        payroll = MockPayroll(_payroll);
        emit PayrollUpdated(_payroll);
    }

    // ============ Case Functions ============

    function requestCase(
        address employee,
        uint32 period,
        bytes32 reasonHash,
        string calldata evidenceURI
    ) external validPeriod(period) returns (uint256 caseId) {
        if (employee == address(0)) revert E_INVALID_ADDRESS();

        caseId = nextCaseId++;

        Case storage newCase = cases[caseId];
        newCase.employee = employee;
        newCase.period = period;
        newCase.reasonHash = reasonHash;
        newCase.evidenceURI = evidenceURI;
        newCase.createdAt = block.timestamp;
        newCase.unlockTime = block.timestamp + TIMELOCK_DURATION;

        emit CaseRequested(
            caseId,
            employee,
            period,
            reasonHash,
            evidenceURI,
            newCase.unlockTime
        );
    }

    function approveByIssuer(uint256 caseId) external onlyIssuer caseExists(caseId) {
        Case storage c = cases[caseId];
        if (c.executed) revert E_CASE_EXECUTED();
        c.issuerApproved = true;
        emit CaseApproved(caseId, "ISSUER");
    }

    function approveByGov(uint256 caseId) external onlyGov caseExists(caseId) {
        Case storage c = cases[caseId];
        if (c.executed) revert E_CASE_EXECUTED();
        c.govApproved = true;
        emit CaseApproved(caseId, "GOV");
    }

    function execute(uint256 caseId) external caseExists(caseId) {
        Case storage c = cases[caseId];

        if (!c.issuerApproved || !c.govApproved) revert E_CASE_NOT_APPROVED();
        if (block.timestamp < c.unlockTime) revert E_CASE_LOCKED();
        if (c.executed) revert E_CASE_EXECUTED();

        c.executed = true;

        payroll.grantGovAccess(c.employee, c.period, caseId);

        emit CaseExecuted(caseId, c.employee, c.period, govMultisig);
    }

    // ============ View Functions ============

    function getCase(uint256 caseId) external view caseExists(caseId) returns (
        address employee,
        uint32 period,
        bytes32 reasonHash,
        string memory evidenceURI,
        bool issuerApproved,
        bool govApproved,
        uint256 createdAt,
        uint256 unlockTime,
        bool executed
    ) {
        Case storage c = cases[caseId];
        return (
            c.employee,
            c.period,
            c.reasonHash,
            c.evidenceURI,
            c.issuerApproved,
            c.govApproved,
            c.createdAt,
            c.unlockTime,
            c.executed
        );
    }

    function canExecute(uint256 caseId) external view caseExists(caseId) returns (bool) {
        Case storage c = cases[caseId];
        return c.issuerApproved &&
               c.govApproved &&
               block.timestamp >= c.unlockTime &&
               !c.executed;
    }

    function getTimelockRemaining(uint256 caseId) external view caseExists(caseId) returns (uint256) {
        Case storage c = cases[caseId];
        if (block.timestamp >= c.unlockTime) return 0;
        return c.unlockTime - block.timestamp;
    }
}
