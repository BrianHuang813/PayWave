// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./lib/Errors.sol";
import "./Payroll.sol";

/**
 * @title ComplianceGate
 * @notice Break-glass mechanism for government access to payslip data
 * @dev Requires dual approval (Issuer + Gov) and 24-hour timelock before granting access
 */
contract ComplianceGate {
    // ============ Constants ============
    
    /// @notice Timelock duration: 24 hours
    uint256 public constant TIMELOCK_DURATION = 24 hours;
    
    // ============ Structs ============
    
    /**
     * @notice Compliance case structure
     */
    struct Case {
        address employee;           // Target employee
        uint32 period;              // Target period (YYYYMM)
        bytes32 reasonHash;         // Hash of reason for audit
        string evidenceURI;         // URI to evidence documents
        bool issuerApproved;        // Issuer multisig approval
        bool govApproved;           // Government multisig approval
        uint256 createdAt;          // Case creation timestamp
        uint256 unlockTime;         // When access can be granted
        bool executed;              // Whether access has been granted
    }
    
    // ============ State Variables ============
    
    /// @notice Contract owner
    address public owner;
    
    /// @notice Issuer multisig address
    address public issuerMultisig;
    
    /// @notice Government multisig address
    address public govMultisig;
    
    /// @notice Payroll contract reference
    Payroll public payroll;
    
    /// @notice Case ID counter
    uint256 public nextCaseId;
    
    /// @notice Cases mapping
    mapping(uint256 => Case) public cases;
    
    // ============ Events ============
    
    /// @notice Emitted when a new case is requested
    event CaseRequested(
        uint256 indexed caseId,
        address indexed employee,
        uint32 indexed period,
        bytes32 reasonHash,
        string evidenceURI,
        uint256 unlockTime
    );
    
    /// @notice Emitted when a case is approved
    event CaseApproved(
        uint256 indexed caseId,
        string approverType  // "ISSUER" or "GOV"
    );
    
    /// @notice Emitted when a case is executed
    event CaseExecuted(
        uint256 indexed caseId,
        address indexed employee,
        uint32 indexed period,
        address govMultisig
    );
    
    /// @notice Admin events
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
     * @notice Set Payroll contract address
     */
    function setPayroll(address _payroll) external onlyOwner {
        if (_payroll == address(0)) revert E_INVALID_ADDRESS();
        payroll = Payroll(_payroll);
        emit PayrollUpdated(_payroll);
    }
    
    // ============ Case Functions ============
    
    /**
     * @notice Request a new compliance case
     * @dev Can be called by anyone (or restrict to gov only if preferred)
     * @param employee Target employee address
     * @param period Target period (YYYYMM)
     * @param reasonHash Hash of the reason for access request
     * @param evidenceURI URI pointing to evidence documents
     * @return caseId The ID of the created case
     */
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
    
    /**
     * @notice Approve case by issuer multisig
     * @param caseId Case ID to approve
     */
    function approveByIssuer(uint256 caseId) external onlyIssuer caseExists(caseId) {
        Case storage c = cases[caseId];
        
        if (c.executed) revert E_CASE_EXECUTED();
        
        c.issuerApproved = true;
        
        emit CaseApproved(caseId, "ISSUER");
    }
    
    /**
     * @notice Approve case by government multisig
     * @param caseId Case ID to approve
     */
    function approveByGov(uint256 caseId) external onlyGov caseExists(caseId) {
        Case storage c = cases[caseId];
        
        if (c.executed) revert E_CASE_EXECUTED();
        
        c.govApproved = true;
        
        emit CaseApproved(caseId, "GOV");
    }
    
    /**
     * @notice Execute the case after timelock expires
     * @dev Grants government access to the target payslip
     * @param caseId Case ID to execute
     */
    function execute(uint256 caseId) external caseExists(caseId) {
        Case storage c = cases[caseId];
        
        // Check approvals
        if (!c.issuerApproved || !c.govApproved) revert E_CASE_NOT_APPROVED();
        
        // Check timelock
        if (block.timestamp < c.unlockTime) revert E_CASE_LOCKED();
        
        // Check not already executed
        if (c.executed) revert E_CASE_EXECUTED();
        
        // Mark as executed
        c.executed = true;
        
        // Grant government access via Payroll contract
        payroll.grantGovAccess(c.employee, c.period, caseId);
        
        emit CaseExecuted(caseId, c.employee, c.period, govMultisig);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get case details
     */
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
    
    /**
     * @notice Check if case is ready to execute
     */
    function canExecute(uint256 caseId) external view caseExists(caseId) returns (bool) {
        Case storage c = cases[caseId];
        return c.issuerApproved && 
               c.govApproved && 
               block.timestamp >= c.unlockTime && 
               !c.executed;
    }
    
    /**
     * @notice Get remaining timelock duration
     */
    function getTimelockRemaining(uint256 caseId) external view caseExists(caseId) returns (uint256) {
        Case storage c = cases[caseId];
        if (block.timestamp >= c.unlockTime) return 0;
        return c.unlockTime - block.timestamp;
    }
}
