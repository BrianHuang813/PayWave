import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("PayWave Mock - Confidential Payroll System", function () {
  let usdc: any;
  let cusdc: any;
  let wrapper: any;
  let treasury: any;
  let payroll: any;
  let gate: any;

  let owner: SignerWithAddress;
  let issuer: SignerWithAddress;
  let gov: SignerWithAddress;
  let employee1: SignerWithAddress;
  let employee2: SignerWithAddress;
  let attacker: SignerWithAddress;

  const PERIOD_202601 = 202601;
  const POLICY_HASH = ethers.keccak256(ethers.toUtf8Bytes("policy_v1"));
  const ONE_USDC = 1_000_000n; // 6 decimals
  const DEPOSIT_AMOUNT = 100_000n * ONE_USDC; // 100,000 USDC

  // Sample salary data (in USDC base units)
  const SALARY_BASE = 5000n * ONE_USDC;     // 5,000 USDC
  const SALARY_BONUS = 1000n * ONE_USDC;    // 1,000 USDC
  const SALARY_PENALTY = 200n * ONE_USDC;   // 200 USDC
  const SALARY_LEAVE = 300n * ONE_USDC;     // 300 USDC
  // Expected net = 5000 + 1000 - 200 - 300 = 5,500 USDC

  beforeEach(async function () {
    [owner, issuer, gov, employee1, employee2, attacker] = await ethers.getSigners();

    // Deploy MockUSDC (standard ERC20)
    const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDCFactory.deploy();

    // Deploy MockcUSDC
    const MockcUSDCFactory = await ethers.getContractFactory("MockcUSDC");
    cusdc = await MockcUSDCFactory.deploy();

    // Deploy MockUSDCWrapper
    const WrapperFactory = await ethers.getContractFactory("MockUSDCWrapper");
    wrapper = await WrapperFactory.deploy(
      await usdc.getAddress(),
      await cusdc.getAddress()
    );

    // Deploy MockPayrollTreasury
    const TreasuryFactory = await ethers.getContractFactory("MockPayrollTreasury");
    treasury = await TreasuryFactory.deploy();

    // Deploy MockPayroll
    const PayrollFactory = await ethers.getContractFactory("MockPayroll");
    payroll = await PayrollFactory.deploy();

    // Deploy MockComplianceGate
    const GateFactory = await ethers.getContractFactory("MockComplianceGate");
    gate = await GateFactory.deploy();

    // Configure MockcUSDC
    await cusdc.setWrapper(await wrapper.getAddress());
    await cusdc.setPayroll(await payroll.getAddress());

    // Configure Treasury
    await treasury.setPayroll(await payroll.getAddress());
    await treasury.setToken(await cusdc.getAddress());

    // Configure Payroll
    await payroll.setIssuer(issuer.address);
    await payroll.setGov(gov.address);
    await payroll.setComplianceGate(await gate.getAddress());
    await payroll.setTreasury(await treasury.getAddress());
    await payroll.setToken(await cusdc.getAddress());

    // Configure ComplianceGate
    await gate.setIssuer(issuer.address);
    await gate.setGov(gov.address);
    await gate.setPayroll(await payroll.getAddress());

    // Mint USDC to issuer for deposits
    await usdc.mint(issuer.address, DEPOSIT_AMOUNT);
  });

  describe("Deployment", function () {
    it("Should deploy all contracts correctly", async function () {
      expect(await usdc.getAddress()).to.be.properAddress;
      expect(await cusdc.getAddress()).to.be.properAddress;
      expect(await wrapper.getAddress()).to.be.properAddress;
      expect(await treasury.getAddress()).to.be.properAddress;
      expect(await payroll.getAddress()).to.be.properAddress;
      expect(await gate.getAddress()).to.be.properAddress;
    });

    it("Should configure roles correctly", async function () {
      expect(await payroll.issuerMultisig()).to.equal(issuer.address);
      expect(await payroll.govMultisig()).to.equal(gov.address);
      expect(await gate.issuerMultisig()).to.equal(issuer.address);
      expect(await gate.govMultisig()).to.equal(gov.address);
    });
  });

  describe("USDC Wrapper - Deposit/Withdraw", function () {
    it("Should allow deposit of USDC and mint cUSDC to treasury", async function () {
      const depositAmount = 10_000n * ONE_USDC;

      // Approve wrapper to spend USDC
      await usdc.connect(issuer).approve(await wrapper.getAddress(), depositAmount);

      // Deposit to treasury
      await expect(
        wrapper.connect(issuer).deposit(depositAmount, await treasury.getAddress())
      )
        .to.emit(wrapper, "Deposited")
        .withArgs(issuer.address, depositAmount, await treasury.getAddress());

      // Check balances
      expect(await usdc.balanceOf(await wrapper.getAddress())).to.equal(depositAmount);
      expect(await cusdc.totalSupply()).to.equal(depositAmount);

      // Check treasury has cUSDC balance (mock decrypted)
      expect(await cusdc.balanceOfDecrypted(await treasury.getAddress())).to.equal(depositAmount);
    });

    it("Should reject deposit with zero amount", async function () {
      await expect(
        wrapper.connect(issuer).deposit(0, await treasury.getAddress())
      ).to.be.revertedWithCustomError(wrapper, "E_INVALID_AMOUNT");
    });

    it("Should reject deposit to zero address", async function () {
      await usdc.connect(issuer).approve(await wrapper.getAddress(), ONE_USDC);
      await expect(
        wrapper.connect(issuer).deposit(ONE_USDC, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(wrapper, "E_INVALID_ADDRESS");
    });
  });

  describe("Payroll - Full Happy Path", function () {
    beforeEach(async function () {
      // Fund treasury with cUSDC
      const depositAmount = 50_000n * ONE_USDC;
      await usdc.connect(issuer).approve(await wrapper.getAddress(), depositAmount);
      await wrapper.connect(issuer).deposit(depositAmount, await treasury.getAddress());
    });

    it("Should allow issuer to set payslip inputs", async function () {
      await expect(
        payroll.connect(issuer).setPayslipInputs(
          employee1.address,
          PERIOD_202601,
          SALARY_BASE,
          SALARY_BONUS,
          SALARY_PENALTY,
          SALARY_LEAVE,
          POLICY_HASH
        )
      )
        .to.emit(payroll, "PayslipInputsSet")
        .withArgs(employee1.address, PERIOD_202601, POLICY_HASH, 1);

      // Check payslip metadata
      const meta = await payroll.getPayslipMeta(employee1.address, PERIOD_202601);
      expect(meta.status).to.equal(0); // DRAFT
      expect(meta.policyHash).to.equal(POLICY_HASH);
      expect(meta.payslipId).to.equal(1);
    });

    it("Should allow issuer to compute payslip with correct net calculation", async function () {
      // Set inputs
      await payroll.connect(issuer).setPayslipInputs(
        employee1.address,
        PERIOD_202601,
        SALARY_BASE,
        SALARY_BONUS,
        SALARY_PENALTY,
        SALARY_LEAVE,
        POLICY_HASH
      );

      // Compute
      await expect(payroll.connect(issuer).computePayslip(employee1.address, PERIOD_202601))
        .to.emit(payroll, "PayslipComputed")
        .withArgs(employee1.address, PERIOD_202601, 1);

      // Check status updated
      const meta = await payroll.getPayslipMeta(employee1.address, PERIOD_202601);
      expect(meta.status).to.equal(1); // COMPUTED

      // Verify computed values (mock decryption)
      const decrypted = await payroll.getPayslipDecrypted(employee1.address, PERIOD_202601);
      expect(decrypted.base).to.equal(SALARY_BASE);
      expect(decrypted.bonus).to.equal(SALARY_BONUS);
      expect(decrypted.penalty).to.equal(SALARY_PENALTY);
      expect(decrypted.unpaidLeaveDeduct).to.equal(SALARY_LEAVE);

      // net = base + bonus - penalty - leave = 5000 + 1000 - 200 - 300 = 5500 USDC
      const expectedNet = SALARY_BASE + SALARY_BONUS - SALARY_PENALTY - SALARY_LEAVE;
      expect(decrypted.net).to.equal(expectedNet);
    });

    it("Should allow issuer to pay employee after compute", async function () {
      // Set inputs and compute
      await payroll.connect(issuer).setPayslipInputs(
        employee1.address,
        PERIOD_202601,
        SALARY_BASE,
        SALARY_BONUS,
        SALARY_PENALTY,
        SALARY_LEAVE,
        POLICY_HASH
      );
      await payroll.connect(issuer).computePayslip(employee1.address, PERIOD_202601);

      // Pay
      await expect(payroll.connect(issuer).pay(employee1.address, PERIOD_202601))
        .to.emit(payroll, "PayslipPaid");

      // Check status updated
      const meta = await payroll.getPayslipMeta(employee1.address, PERIOD_202601);
      expect(meta.status).to.equal(2); // PAID

      // Check employee received cUSDC
      const expectedNet = SALARY_BASE + SALARY_BONUS - SALARY_PENALTY - SALARY_LEAVE;
      expect(await cusdc.balanceOfDecrypted(employee1.address)).to.equal(expectedNet);
    });

    it("Should complete full happy path: deposit → inputs → compute → pay", async function () {
      // 1. Set inputs
      await payroll.connect(issuer).setPayslipInputs(
        employee1.address,
        PERIOD_202601,
        SALARY_BASE,
        SALARY_BONUS,
        SALARY_PENALTY,
        SALARY_LEAVE,
        POLICY_HASH
      );

      // 2. Compute
      await payroll.connect(issuer).computePayslip(employee1.address, PERIOD_202601);

      // 3. Pay
      await payroll.connect(issuer).pay(employee1.address, PERIOD_202601);

      // Verify final state
      const meta = await payroll.getPayslipMeta(employee1.address, PERIOD_202601);
      expect(meta.status).to.equal(2); // PAID
      expect(meta.paidAt).to.be.gt(0);

      // Verify employee balance
      const expectedNet = SALARY_BASE + SALARY_BONUS - SALARY_PENALTY - SALARY_LEAVE;
      expect(await cusdc.balanceOfDecrypted(employee1.address)).to.equal(expectedNet);
    });

    it("Should handle case where deductions exceed gross (net = 0)", async function () {
      // Set inputs where deductions > earnings
      const lowBase = 100n * ONE_USDC;
      const lowBonus = 50n * ONE_USDC;
      const highPenalty = 200n * ONE_USDC;
      const highLeave = 100n * ONE_USDC;
      // gross = 150, deduct = 300, net should = 0

      await payroll.connect(issuer).setPayslipInputs(
        employee1.address,
        PERIOD_202601,
        lowBase,
        lowBonus,
        highPenalty,
        highLeave,
        POLICY_HASH
      );

      await payroll.connect(issuer).computePayslip(employee1.address, PERIOD_202601);

      // Verify net is 0 (not negative)
      const decrypted = await payroll.getPayslipDecrypted(employee1.address, PERIOD_202601);
      expect(decrypted.net).to.equal(0);
    });
  });

  describe("Payroll - Access Control", function () {
    it("Should reject non-issuer setting payslip inputs", async function () {
      await expect(
        payroll.connect(attacker).setPayslipInputs(
          employee1.address,
          PERIOD_202601,
          SALARY_BASE,
          SALARY_BONUS,
          SALARY_PENALTY,
          SALARY_LEAVE,
          POLICY_HASH
        )
      ).to.be.revertedWithCustomError(payroll, "E_NOT_ISSUER");
    });

    it("Should reject non-issuer computing payslip", async function () {
      await expect(
        payroll.connect(attacker).computePayslip(employee1.address, PERIOD_202601)
      ).to.be.revertedWithCustomError(payroll, "E_NOT_ISSUER");
    });

    it("Should reject non-issuer paying", async function () {
      await expect(
        payroll.connect(attacker).pay(employee1.address, PERIOD_202601)
      ).to.be.revertedWithCustomError(payroll, "E_NOT_ISSUER");
    });

    it("Should reject invalid period format (month > 12)", async function () {
      await expect(
        payroll.connect(issuer).setPayslipInputs(
          employee1.address,
          202613, // Invalid: month 13
          SALARY_BASE,
          SALARY_BONUS,
          SALARY_PENALTY,
          SALARY_LEAVE,
          POLICY_HASH
        )
      ).to.be.revertedWithCustomError(payroll, "E_INVALID_PERIOD");
    });

    it("Should reject invalid period format (month = 0)", async function () {
      await expect(
        payroll.connect(issuer).setPayslipInputs(
          employee1.address,
          202600, // Invalid: month 0
          SALARY_BASE,
          SALARY_BONUS,
          SALARY_PENALTY,
          SALARY_LEAVE,
          POLICY_HASH
        )
      ).to.be.revertedWithCustomError(payroll, "E_INVALID_PERIOD");
    });
  });

  describe("ComplianceGate - Break-Glass Flow", function () {
    const REASON_HASH = ethers.keccak256(ethers.toUtf8Bytes("tax_audit_2026"));
    const EVIDENCE_URI = "ipfs://QmAuditEvidence123";

    beforeEach(async function () {
      // Setup a paid payslip
      const depositAmount = 50_000n * ONE_USDC;
      await usdc.connect(issuer).approve(await wrapper.getAddress(), depositAmount);
      await wrapper.connect(issuer).deposit(depositAmount, await treasury.getAddress());

      await payroll.connect(issuer).setPayslipInputs(
        employee1.address,
        PERIOD_202601,
        SALARY_BASE,
        SALARY_BONUS,
        SALARY_PENALTY,
        SALARY_LEAVE,
        POLICY_HASH
      );
      await payroll.connect(issuer).computePayslip(employee1.address, PERIOD_202601);
      await payroll.connect(issuer).pay(employee1.address, PERIOD_202601);
    });

    it("Should allow creating a compliance case", async function () {
      const tx = await gate.requestCase(
        employee1.address,
        PERIOD_202601,
        REASON_HASH,
        EVIDENCE_URI
      );
      const receipt = await tx.wait();

      // Get case details
      const caseData = await gate.getCase(1);
      expect(caseData.employee).to.equal(employee1.address);
      expect(caseData.period).to.equal(PERIOD_202601);
      expect(caseData.reasonHash).to.equal(REASON_HASH);
    });

    it("Should allow issuer to approve case", async function () {
      await gate.requestCase(employee1.address, PERIOD_202601, REASON_HASH, EVIDENCE_URI);

      await expect(gate.connect(issuer).approveByIssuer(1))
        .to.emit(gate, "CaseApproved")
        .withArgs(1, "ISSUER");
    });

    it("Should allow gov to approve case", async function () {
      await gate.requestCase(employee1.address, PERIOD_202601, REASON_HASH, EVIDENCE_URI);

      await expect(gate.connect(gov).approveByGov(1))
        .to.emit(gate, "CaseApproved")
        .withArgs(1, "GOV");
    });

    it("Should reject execution before timelock expires", async function () {
      await gate.requestCase(employee1.address, PERIOD_202601, REASON_HASH, EVIDENCE_URI);
      await gate.connect(issuer).approveByIssuer(1);
      await gate.connect(gov).approveByGov(1);

      await expect(gate.execute(1)).to.be.revertedWithCustomError(gate, "E_CASE_LOCKED");
    });

    it("Should reject execution without both approvals", async function () {
      await gate.requestCase(employee1.address, PERIOD_202601, REASON_HASH, EVIDENCE_URI);
      await gate.connect(issuer).approveByIssuer(1);
      // Missing gov approval

      // Advance time past timelock
      await time.increase(86401);

      await expect(gate.execute(1)).to.be.revertedWithCustomError(gate, "E_CASE_NOT_APPROVED");
    });

    it("Should execute case after dual approval and timelock", async function () {
      await gate.requestCase(employee1.address, PERIOD_202601, REASON_HASH, EVIDENCE_URI);
      await gate.connect(issuer).approveByIssuer(1);
      await gate.connect(gov).approveByGov(1);

      // Advance time past timelock
      await time.increase(86401);

      await expect(gate.execute(1))
        .to.emit(gate, "CaseExecuted")
        .withArgs(1, employee1.address, PERIOD_202601, gov.address);

      // Check case is marked as executed
      const caseData = await gate.getCase(1);
      expect(caseData.executed).to.be.true;
    });

    it("Should complete full break-glass flow", async function () {
      // 1. Request case
      await gate.requestCase(employee1.address, PERIOD_202601, REASON_HASH, EVIDENCE_URI);

      // 2. Dual approvals
      await gate.connect(issuer).approveByIssuer(1);
      await gate.connect(gov).approveByGov(1);

      // Check cannot execute yet
      expect(await gate.canExecute(1)).to.be.false;
      expect(await gate.getTimelockRemaining(1)).to.be.gt(0);

      // 3. Wait for timelock
      await time.increase(86401);

      // Now can execute
      expect(await gate.canExecute(1)).to.be.true;
      expect(await gate.getTimelockRemaining(1)).to.equal(0);

      // 4. Execute
      await gate.execute(1);

      // Verify gov access was granted
      const caseData = await gate.getCase(1);
      expect(caseData.executed).to.be.true;
    });

    it("Should reject double execution", async function () {
      await gate.requestCase(employee1.address, PERIOD_202601, REASON_HASH, EVIDENCE_URI);
      await gate.connect(issuer).approveByIssuer(1);
      await gate.connect(gov).approveByGov(1);
      await time.increase(86401);
      await gate.execute(1);

      await expect(gate.execute(1)).to.be.revertedWithCustomError(gate, "E_CASE_EXECUTED");
    });
  });

  describe("ComplianceGate - Access Control", function () {
    const REASON_HASH = ethers.keccak256(ethers.toUtf8Bytes("audit"));
    const EVIDENCE_URI = "ipfs://evidence";

    it("Should reject non-issuer approving as issuer", async function () {
      await gate.requestCase(employee1.address, PERIOD_202601, REASON_HASH, EVIDENCE_URI);

      await expect(gate.connect(attacker).approveByIssuer(1)).to.be.revertedWithCustomError(
        gate,
        "E_NOT_ISSUER"
      );
    });

    it("Should reject non-gov approving as gov", async function () {
      await gate.requestCase(employee1.address, PERIOD_202601, REASON_HASH, EVIDENCE_URI);

      await expect(gate.connect(attacker).approveByGov(1)).to.be.revertedWithCustomError(
        gate,
        "E_NOT_GOV"
      );
    });
  });

  describe("MockcUSDC - Access Control", function () {
    it("Should reject non-wrapper calling mint", async function () {
      await expect(
        cusdc.connect(attacker).mint(employee1.address, ONE_USDC)
      ).to.be.revertedWithCustomError(cusdc, "E_NOT_WRAPPER");
    });

    it("Should reject non-wrapper calling burn", async function () {
      await expect(
        cusdc.connect(attacker).burn(employee1.address, ONE_USDC)
      ).to.be.revertedWithCustomError(cusdc, "E_NOT_WRAPPER");
    });

    it("Should reject non-payroll calling transferEncryptedFrom", async function () {
      await expect(
        cusdc.connect(attacker).transferEncryptedFrom(
          await treasury.getAddress(),
          employee1.address,
          0 // Mock euint64 handle
        )
      ).to.be.revertedWithCustomError(cusdc, "E_NOT_PAYROLL");
    });
  });

  describe("Multiple Employees", function () {
    beforeEach(async function () {
      const depositAmount = 100_000n * ONE_USDC;
      await usdc.connect(issuer).approve(await wrapper.getAddress(), depositAmount);
      await wrapper.connect(issuer).deposit(depositAmount, await treasury.getAddress());
    });

    it("Should handle multiple employees with different salaries", async function () {
      // Employee 1: Base developer
      const emp1Base = 4000n * ONE_USDC;
      const emp1Bonus = 500n * ONE_USDC;

      // Employee 2: Senior developer
      const emp2Base = 7000n * ONE_USDC;
      const emp2Bonus = 1500n * ONE_USDC;

      // Set and pay employee 1
      await payroll.connect(issuer).setPayslipInputs(
        employee1.address, PERIOD_202601, emp1Base, emp1Bonus, 0, 0, POLICY_HASH
      );
      await payroll.connect(issuer).computePayslip(employee1.address, PERIOD_202601);
      await payroll.connect(issuer).pay(employee1.address, PERIOD_202601);

      // Set and pay employee 2
      await payroll.connect(issuer).setPayslipInputs(
        employee2.address, PERIOD_202601, emp2Base, emp2Bonus, 0, 0, POLICY_HASH
      );
      await payroll.connect(issuer).computePayslip(employee2.address, PERIOD_202601);
      await payroll.connect(issuer).pay(employee2.address, PERIOD_202601);

      // Verify balances
      expect(await cusdc.balanceOfDecrypted(employee1.address)).to.equal(emp1Base + emp1Bonus);
      expect(await cusdc.balanceOfDecrypted(employee2.address)).to.equal(emp2Base + emp2Bonus);
    });
  });
});
