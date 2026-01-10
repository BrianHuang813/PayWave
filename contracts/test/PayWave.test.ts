import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
  MockUSDC,
  CUSDC,
  USDCWrapper,
  PayrollTreasury,
  Payroll,
  ComplianceGate,
} from "../typechain-types";

describe("PayWave - Confidential Payroll System", function () {
  let usdc: MockUSDC;
  let cusdc: CUSDC;
  let wrapper: USDCWrapper;
  let treasury: PayrollTreasury;
  let payroll: Payroll;
  let gate: ComplianceGate;

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

  beforeEach(async function () {
    [owner, issuer, gov, employee1, employee2, attacker] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDCFactory.deploy() as unknown as MockUSDC;

    // Deploy cUSDC
    const CUSDCFactory = await ethers.getContractFactory("cUSDC");
    cusdc = await CUSDCFactory.deploy() as unknown as CUSDC;

    // Deploy USDCWrapper
    const WrapperFactory = await ethers.getContractFactory("USDCWrapper");
    wrapper = await WrapperFactory.deploy(
      await usdc.getAddress(),
      await cusdc.getAddress()
    ) as unknown as USDCWrapper;

    // Deploy PayrollTreasury
    const TreasuryFactory = await ethers.getContractFactory("PayrollTreasury");
    treasury = await TreasuryFactory.deploy() as unknown as PayrollTreasury;

    // Deploy Payroll
    const PayrollFactory = await ethers.getContractFactory("Payroll");
    payroll = await PayrollFactory.deploy() as unknown as Payroll;

    // Deploy ComplianceGate
    const GateFactory = await ethers.getContractFactory("ComplianceGate");
    gate = await GateFactory.deploy() as unknown as ComplianceGate;

    // Configure cUSDC
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

  describe("Payroll - Happy Path", function () {
    beforeEach(async function () {
      // Fund treasury with cUSDC
      const depositAmount = 50_000n * ONE_USDC;
      await usdc.connect(issuer).approve(await wrapper.getAddress(), depositAmount);
      await wrapper.connect(issuer).deposit(depositAmount, await treasury.getAddress());
    });

    it("Should allow issuer to set payslip inputs", async function () {
      const packedCiphertext = ethers.toUtf8Bytes("encrypted_salary_data");
      const inputProof = ethers.toUtf8Bytes("zk_proof");

      await expect(
        payroll
          .connect(issuer)
          .setPayslipInputs(
            employee1.address,
            PERIOD_202601,
            packedCiphertext,
            inputProof,
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

    it("Should allow issuer to compute payslip", async function () {
      // Set inputs first
      const packedCiphertext = ethers.toUtf8Bytes("encrypted_salary_data");
      const inputProof = ethers.toUtf8Bytes("zk_proof");
      await payroll
        .connect(issuer)
        .setPayslipInputs(
          employee1.address,
          PERIOD_202601,
          packedCiphertext,
          inputProof,
          POLICY_HASH
        );

      // Compute
      await expect(payroll.connect(issuer).computePayslip(employee1.address, PERIOD_202601))
        .to.emit(payroll, "PayslipComputed")
        .withArgs(employee1.address, PERIOD_202601, 1);

      // Check status updated
      const meta = await payroll.getPayslipMeta(employee1.address, PERIOD_202601);
      expect(meta.status).to.equal(1); // COMPUTED
    });

    it("Should allow issuer to pay employee after compute", async function () {
      // Set inputs and compute
      const packedCiphertext = ethers.toUtf8Bytes("encrypted_salary_data");
      const inputProof = ethers.toUtf8Bytes("zk_proof");
      await payroll
        .connect(issuer)
        .setPayslipInputs(
          employee1.address,
          PERIOD_202601,
          packedCiphertext,
          inputProof,
          POLICY_HASH
        );
      await payroll.connect(issuer).computePayslip(employee1.address, PERIOD_202601);

      // Pay
      await expect(payroll.connect(issuer).pay(employee1.address, PERIOD_202601))
        .to.emit(payroll, "PayslipPaid");

      // Check status updated
      const meta = await payroll.getPayslipMeta(employee1.address, PERIOD_202601);
      expect(meta.status).to.equal(2); // PAID
    });

    it("Should complete full happy path: deposit → inputs → compute → pay", async function () {
      const packedCiphertext = ethers.toUtf8Bytes("encrypted_salary_data");
      const inputProof = ethers.toUtf8Bytes("zk_proof");

      // 1. Set inputs
      await payroll
        .connect(issuer)
        .setPayslipInputs(
          employee1.address,
          PERIOD_202601,
          packedCiphertext,
          inputProof,
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
    });
  });

  describe("Payroll - Access Control", function () {
    it("Should reject non-issuer setting payslip inputs", async function () {
      const packedCiphertext = ethers.toUtf8Bytes("data");
      const inputProof = ethers.toUtf8Bytes("proof");

      await expect(
        payroll
          .connect(attacker)
          .setPayslipInputs(
            employee1.address,
            PERIOD_202601,
            packedCiphertext,
            inputProof,
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

    it("Should reject invalid period format", async function () {
      const packedCiphertext = ethers.toUtf8Bytes("data");
      const inputProof = ethers.toUtf8Bytes("proof");

      // Invalid month (13)
      await expect(
        payroll
          .connect(issuer)
          .setPayslipInputs(
            employee1.address,
            202613,
            packedCiphertext,
            inputProof,
            POLICY_HASH
          )
      ).to.be.revertedWithCustomError(payroll, "E_INVALID_PERIOD");

      // Invalid month (0)
      await expect(
        payroll
          .connect(issuer)
          .setPayslipInputs(
            employee1.address,
            202600,
            packedCiphertext,
            inputProof,
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

      const packedCiphertext = ethers.toUtf8Bytes("encrypted_salary_data");
      const inputProof = ethers.toUtf8Bytes("zk_proof");
      await payroll
        .connect(issuer)
        .setPayslipInputs(
          employee1.address,
          PERIOD_202601,
          packedCiphertext,
          inputProof,
          POLICY_HASH
        );
      await payroll.connect(issuer).computePayslip(employee1.address, PERIOD_202601);
      await payroll.connect(issuer).pay(employee1.address, PERIOD_202601);
    });

    it("Should allow creating a compliance case", async function () {
      await expect(
        gate.requestCase(employee1.address, PERIOD_202601, REASON_HASH, EVIDENCE_URI)
      )
        .to.emit(gate, "CaseRequested")
        .withArgs(1, employee1.address, PERIOD_202601, REASON_HASH, EVIDENCE_URI, await time.latest() + 86400);
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
      await time.increase(86401); // 24 hours + 1 second

      await expect(gate.execute(1)).to.be.revertedWithCustomError(
        gate,
        "E_CASE_NOT_APPROVED"
      );
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

    it("Should complete full break-glass flow: request → approvals → timelock → execute", async function () {
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

      // Verify gov access was granted (via event)
      // In real system, gov could now decrypt the payslip
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

  describe("cUSDC - Access Control", function () {
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
      // Mock euint64 handle
      const mockHandle = 12345n;

      await expect(
        cusdc.connect(attacker).transferEncryptedFrom(
          await treasury.getAddress(),
          employee1.address,
          mockHandle
        )
      ).to.be.revertedWithCustomError(cusdc, "E_NOT_PAYROLL");
    });
  });
});
