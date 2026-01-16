import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying MOCK contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // For MVP, deployer acts as both issuer and gov multisig
  const issuerMultisig = deployer.address;
  const govMultisig = deployer.address;

  console.log("\n========================================");
  console.log("    PayWave Mock Deployment (Local)");
  console.log("========================================\n");

  console.log("--- Deploying MockUSDC ---");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  console.log("MockUSDC deployed to:", await usdc.getAddress());

  console.log("\n--- Deploying MockcUSDC ---");
  const MockcUSDC = await ethers.getContractFactory("MockcUSDC");
  const cusdc = await MockcUSDC.deploy();
  await cusdc.waitForDeployment();
  console.log("MockcUSDC deployed to:", await cusdc.getAddress());

  console.log("\n--- Deploying MockUSDCWrapper ---");
  const MockUSDCWrapper = await ethers.getContractFactory("MockUSDCWrapper");
  const wrapper = await MockUSDCWrapper.deploy(
    await usdc.getAddress(),
    await cusdc.getAddress()
  );
  await wrapper.waitForDeployment();
  console.log("MockUSDCWrapper deployed to:", await wrapper.getAddress());

  console.log("\n--- Deploying MockPayrollTreasury ---");
  const MockPayrollTreasury = await ethers.getContractFactory("MockPayrollTreasury");
  const treasury = await MockPayrollTreasury.deploy();
  await treasury.waitForDeployment();
  console.log("MockPayrollTreasury deployed to:", await treasury.getAddress());

  console.log("\n--- Deploying MockPayroll ---");
  const MockPayroll = await ethers.getContractFactory("MockPayroll");
  const payroll = await MockPayroll.deploy();
  await payroll.waitForDeployment();
  console.log("MockPayroll deployed to:", await payroll.getAddress());

  console.log("\n--- Deploying MockComplianceGate ---");
  const MockComplianceGate = await ethers.getContractFactory("MockComplianceGate");
  const gate = await MockComplianceGate.deploy();
  await gate.waitForDeployment();
  console.log("MockComplianceGate deployed to:", await gate.getAddress());

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

  // Mint test USDC to deployer
  const INITIAL_MINT = ethers.parseUnits("1000000", 6); // 1,000,000 USDC
  await usdc.mint(deployer.address, INITIAL_MINT);
  console.log("\nMinted 1,000,000 MockUSDC to deployer");

  console.log("\n========================================");
  console.log("         Deployment Summary");
  console.log("========================================");
  console.log("MockUSDC:           ", await usdc.getAddress());
  console.log("MockcUSDC:          ", await cusdc.getAddress());
  console.log("MockUSDCWrapper:    ", await wrapper.getAddress());
  console.log("MockPayrollTreasury:", await treasury.getAddress());
  console.log("MockPayroll:        ", await payroll.getAddress());
  console.log("MockComplianceGate: ", await gate.getAddress());
  console.log("========================================");
  console.log("Issuer Multisig:    ", issuerMultisig);
  console.log("Gov Multisig:       ", govMultisig);
  console.log("========================================");

  // Return addresses for frontend env setup
  const addresses = {
    usdc: await usdc.getAddress(),
    cusdc: await cusdc.getAddress(),
    wrapper: await wrapper.getAddress(),
    treasury: await treasury.getAddress(),
    payroll: await payroll.getAddress(),
    gate: await gate.getAddress(),
    issuer: issuerMultisig,
    gov: govMultisig,
  };

  console.log("\n========================================");
  console.log("  Frontend .env.local Configuration");
  console.log("========================================");
  console.log(`NEXT_PUBLIC_CHAIN_ID=31337`);
  console.log(`NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545`);
  console.log(`NEXT_PUBLIC_USDC_ADDRESS=${addresses.usdc}`);
  console.log(`NEXT_PUBLIC_CUSDC_ADDRESS=${addresses.cusdc}`);
  console.log(`NEXT_PUBLIC_WRAPPER_ADDRESS=${addresses.wrapper}`);
  console.log(`NEXT_PUBLIC_TREASURY_ADDRESS=${addresses.treasury}`);
  console.log(`NEXT_PUBLIC_PAYROLL_ADDRESS=${addresses.payroll}`);
  console.log(`NEXT_PUBLIC_GATE_ADDRESS=${addresses.gate}`);
  console.log("========================================");

  console.log("\n✅ Mock deployment complete!");
  console.log("\n📝 How to get test tokens:");
  console.log("   1. The deployer account already has 1,000,000 MockUSDC");
  console.log("   2. To mint more, call: MockUSDC.mint(address, amount)");
  console.log("   3. Use Hardhat console: npx hardhat console --network localhost");
  console.log('      > const usdc = await ethers.getContractAt("MockUSDC", "' + addresses.usdc + '")');
  console.log('      > await usdc.mint("YOUR_ADDRESS", ethers.parseUnits("10000", 6))');

  return addresses;
}

main()
  .then((addresses) => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
