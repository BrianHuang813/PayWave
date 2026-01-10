import { ethers } from "hardhat";
import type {
  MockUSDC,
  CUSDC,
  USDCWrapper,
  PayrollTreasury,
  Payroll,
  ComplianceGate,
} from "../typechain-types";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // For MVP, deployer acts as both issuer and gov multisig
  // In production, these would be actual multisig addresses
  const issuerMultisig = deployer.address;
  const govMultisig = deployer.address;

  console.log("\n--- Deploying MockUSDC ---");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy() as unknown as MockUSDC;
  await usdc.waitForDeployment();
  console.log("MockUSDC deployed to:", await usdc.getAddress());

  console.log("\n--- Deploying cUSDC ---");
  const CUSDC = await ethers.getContractFactory("cUSDC");
  const cusdc = await CUSDC.deploy() as unknown as CUSDC;
  await cusdc.waitForDeployment();
  console.log("cUSDC deployed to:", await cusdc.getAddress());

  console.log("\n--- Deploying USDCWrapper ---");
  const USDCWrapper = await ethers.getContractFactory("USDCWrapper");
  const wrapper = await USDCWrapper.deploy(
    await usdc.getAddress(),
    await cusdc.getAddress()
  ) as unknown as USDCWrapper;
  await wrapper.waitForDeployment();
  console.log("USDCWrapper deployed to:", await wrapper.getAddress());

  console.log("\n--- Deploying PayrollTreasury ---");
  const PayrollTreasury = await ethers.getContractFactory("PayrollTreasury");
  const treasury = await PayrollTreasury.deploy() as unknown as PayrollTreasury;
  await treasury.waitForDeployment();
  console.log("PayrollTreasury deployed to:", await treasury.getAddress());

  console.log("\n--- Deploying Payroll ---");
  const Payroll = await ethers.getContractFactory("Payroll");
  const payroll = await Payroll.deploy() as unknown as Payroll;
  await payroll.waitForDeployment();
  console.log("Payroll deployed to:", await payroll.getAddress());

  console.log("\n--- Deploying ComplianceGate ---");
  const ComplianceGate = await ethers.getContractFactory("ComplianceGate");
  const gate = await ComplianceGate.deploy() as unknown as ComplianceGate;
  await gate.waitForDeployment();
  console.log("ComplianceGate deployed to:", await gate.getAddress());

  // Configure contracts
  console.log("\n--- Configuring contracts ---");

  // Configure cUSDC
  await cusdc.setWrapper(await wrapper.getAddress());
  console.log("cUSDC: wrapper set");
  await cusdc.setPayroll(await payroll.getAddress());
  console.log("cUSDC: payroll set");

  // Configure Treasury
  await treasury.setPayroll(await payroll.getAddress());
  console.log("Treasury: payroll set");
  await treasury.setToken(await cusdc.getAddress());
  console.log("Treasury: token set");

  // Configure Payroll
  await payroll.setIssuer(issuerMultisig);
  console.log("Payroll: issuer set");
  await payroll.setGov(govMultisig);
  console.log("Payroll: gov set");
  await payroll.setComplianceGate(await gate.getAddress());
  console.log("Payroll: gate set");
  await payroll.setTreasury(await treasury.getAddress());
  console.log("Payroll: treasury set");
  await payroll.setToken(await cusdc.getAddress());
  console.log("Payroll: token set");

  // Configure ComplianceGate
  await gate.setIssuer(issuerMultisig);
  console.log("Gate: issuer set");
  await gate.setGov(govMultisig);
  console.log("Gate: gov set");
  await gate.setPayroll(await payroll.getAddress());
  console.log("Gate: payroll set");

  console.log("\n========================================");
  console.log("Deployment Summary:");
  console.log("========================================");
  console.log("MockUSDC:        ", await usdc.getAddress());
  console.log("cUSDC:           ", await cusdc.getAddress());
  console.log("USDCWrapper:     ", await wrapper.getAddress());
  console.log("PayrollTreasury: ", await treasury.getAddress());
  console.log("Payroll:         ", await payroll.getAddress());
  console.log("ComplianceGate:  ", await gate.getAddress());
  console.log("========================================");
  console.log("Issuer Multisig: ", issuerMultisig);
  console.log("Gov Multisig:    ", govMultisig);
  console.log("========================================");

  // Return addresses for frontend env setup
  return {
    usdc: await usdc.getAddress(),
    cusdc: await cusdc.getAddress(),
    wrapper: await wrapper.getAddress(),
    treasury: await treasury.getAddress(),
    payroll: await payroll.getAddress(),
    gate: await gate.getAddress(),
    issuer: issuerMultisig,
    gov: govMultisig,
  };
}

main()
  .then((addresses) => {
    console.log("\nExport for frontend .env:");
    console.log(`NEXT_PUBLIC_USDC_ADDRESS=${addresses.usdc}`);
    console.log(`NEXT_PUBLIC_CUSDC_ADDRESS=${addresses.cusdc}`);
    console.log(`NEXT_PUBLIC_WRAPPER_ADDRESS=${addresses.wrapper}`);
    console.log(`NEXT_PUBLIC_TREASURY_ADDRESS=${addresses.treasury}`);
    console.log(`NEXT_PUBLIC_PAYROLL_ADDRESS=${addresses.payroll}`);
    console.log(`NEXT_PUBLIC_GATE_ADDRESS=${addresses.gate}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
