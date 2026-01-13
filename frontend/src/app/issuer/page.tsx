"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/navbar";
import { TerminalWindow } from "@/components/ui/terminal-window";
import { TerminalInput } from "@/components/ui/terminal-input";
import { NeonButton } from "@/components/ui/neon-button";
import { NeonCard } from "@/components/ui/neon-card";
import { useToast } from "@/components/ui/use-toast";
import {
  formatUSDC,
  formatAddress,
  formatPeriod,
  getStatusLabel,
  getStatusColor,
  parseUSDC,
} from "@/lib/utils";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { USDC_ABI, WRAPPER_ABI, PAYROLL_ABI } from "@/lib/contracts";
import { getContractAddress } from "@/lib/addresses";
import { createEncryptedPayslipInputs } from "@/lib/fhevm";
import {
  Wallet,
  ArrowDownToLine,
  FileText,
  Calculator,
  Send,
  RefreshCw,
  Plus,
  Users,
  Clock,
} from "lucide-react";
import { keccak256, toBytes, encodeFunctionData, parseUnits } from "viem";

// Mock employee data for demo
const mockEmployees = [
  { address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", name: "Alice" },
  { address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", name: "Bob" },
  { address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906", name: "Charlie" },
];

export default function IssuerPage() {
  const { address, isConnected, chainId } = useAccount();
  const { toast } = useToast();
  const { writeContract, isPending } = useWriteContract();

  // Form states
  const [depositAmount, setDepositAmount] = React.useState("");
  const [selectedEmployee, setSelectedEmployee] = React.useState("");
  const [selectedPeriod, setSelectedPeriod] = React.useState("202601");
  const [baseSalary, setBaseSalary] = React.useState("");
  const [bonus, setBonus] = React.useState("");
  const [penalty, setPenalty] = React.useState("");
  const [unpaidLeave, setUnpaidLeave] = React.useState("");

  // Activity log
  const [activityLog, setActivityLog] = React.useState<string[]>([
    `[${new Date().toLocaleTimeString()}] System initialized`,
    `[${new Date().toLocaleTimeString()}] Waiting for wallet connection...`,
  ]);

  const addLog = (message: string) => {
    setActivityLog((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ${message}`,
    ]);
  };

  // Contract addresses
  const usdcAddress = getContractAddress("usdc", chainId);
  const wrapperAddress = getContractAddress("wrapper", chainId);
  const treasuryAddress = getContractAddress("treasury", chainId);
  const payrollAddress = getContractAddress("payroll", chainId);

  // Read USDC balance
  const { data: usdcBalance } = useReadContract({
    address: usdcAddress,
    abi: USDC_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Handlers
  const handleDeposit = async () => {
    if (!depositAmount || !address) return;

    try {
      const amount = parseUSDC(depositAmount);

      // First approve
      addLog(`Approving ${depositAmount} USDC for wrapper...`);
      
      writeContract({
        address: usdcAddress,
        abi: USDC_ABI,
        functionName: "approve",
        args: [wrapperAddress, amount],
      });

      toast({
        title: "Approval Submitted",
        description: "Please confirm the deposit transaction next",
        variant: "default",
      });

      // In real app, wait for approval then deposit
      // For demo, we'll show the flow
      setTimeout(() => {
        addLog(`Depositing ${depositAmount} USDC to treasury...`);
        writeContract({
          address: wrapperAddress,
          abi: WRAPPER_ABI,
          functionName: "deposit",
          args: [amount, treasuryAddress],
        });
        addLog(`Deposit submitted. Check wallet for confirmation.`);
      }, 2000);

    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to initiate deposit",
        variant: "destructive",
      });
    }
  };

  const handleSetPayslip = async () => {
    if (!selectedEmployee || !selectedPeriod || !address) return;

    try {
      addLog(`Creating encrypted payslip for ${formatAddress(selectedEmployee)}...`);

      // 準備薪資資料 (轉換為 USDC 6 decimals)
      const payslipData = {
        baseSalary: parseUSDC(baseSalary || "0"),
        bonus: parseUSDC(bonus || "0"),
        penalty: parseUSDC(penalty || "0"),
        unpaidLeave: parseUSDC(unpaidLeave || "0"),
      };

      addLog(`Encrypting salary data with FHEVM...`);

      // 使用 FHEVM SDK 建立加密輸入
      const { handles, inputProof } = await createEncryptedPayslipInputs(
        payrollAddress,
        address,
        payslipData,
        chainId || 31337
      );

      addLog(`Encrypted inputs created. Submitting to contract...`);

      const policyHash = keccak256(toBytes("policy_v1"));

      writeContract({
        address: payrollAddress,
        abi: PAYROLL_ABI,
        functionName: "setPayslipInputs",
        args: [
          selectedEmployee as `0x${string}`,
          parseInt(selectedPeriod),
          handles[0], // baseHandle
          handles[1], // bonusHandle
          handles[2], // penaltyHandle
          handles[3], // unpaidLeaveHandle
          inputProof,
          policyHash,
        ],
      });

      addLog(`Payslip inputs set for period ${formatPeriod(parseInt(selectedPeriod))}`);
      
      toast({
        title: "Payslip Created",
        description: "Encrypted payslip inputs have been set using FHEVM",
        variant: "success",
      });
    } catch (error) {
      console.error(error);
      addLog(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: "Error",
        description: "Failed to create payslip",
        variant: "destructive",
      });
    }
  };

  const handleCompute = async () => {
    if (!selectedEmployee || !selectedPeriod) return;

    try {
      addLog(`Computing net pay for ${formatAddress(selectedEmployee)}...`);

      writeContract({
        address: payrollAddress,
        abi: PAYROLL_ABI,
        functionName: "computePayslip",
        args: [
          selectedEmployee as `0x${string}`,
          parseInt(selectedPeriod),
        ],
      });

      addLog(`Net pay computed (encrypted)`);
      
      toast({
        title: "Computed",
        description: "Net pay has been calculated",
        variant: "success",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to compute payslip",
        variant: "destructive",
      });
    }
  };

  const handlePay = async () => {
    if (!selectedEmployee || !selectedPeriod) return;

    try {
      addLog(`Executing payment to ${formatAddress(selectedEmployee)}...`);

      writeContract({
        address: payrollAddress,
        abi: PAYROLL_ABI,
        functionName: "pay",
        args: [
          selectedEmployee as `0x${string}`,
          parseInt(selectedPeriod),
        ],
      });

      addLog(`Payment executed (encrypted amount)`);
      
      toast({
        title: "Payment Sent",
        description: "Confidential payment has been executed",
        variant: "success",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to execute payment",
        variant: "destructive",
      });
    }
  };

  React.useEffect(() => {
    if (isConnected && address) {
      addLog(`Wallet connected: ${formatAddress(address)}`);
    }
  }, [isConnected, address]);

  return (
    <div className="min-h-screen bg-vapor-bg">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-orbitron text-3xl md:text-4xl font-bold text-vapor-foreground mb-2">
            Issuer Dashboard
          </h1>
          <p className="text-vapor-muted">
            Manage payroll, deposit funds, and pay employees
          </p>
        </motion.div>

        {!isConnected ? (
          <NeonCard className="max-w-md mx-auto text-center py-12">
            <Wallet className="w-16 h-16 mx-auto text-vapor-cyan mb-4" />
            <h2 className="font-orbitron text-xl font-semibold mb-2">
              Connect Wallet
            </h2>
            <p className="text-vapor-muted mb-4">
              Please connect your wallet to access the issuer dashboard
            </p>
          </NeonCard>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Deposit & Employee List */}
            <div className="space-y-6">
              {/* Deposit Panel */}
              <TerminalWindow title="deposit_usdc" headerColor="cyan">
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-vapor-muted">Your USDC Balance:</span>
                    <span className="text-vapor-cyan font-mono">
                      ${formatUSDC(usdcBalance || BigInt(0))}
                    </span>
                  </div>

                  <TerminalInput
                    label="Amount (USDC)"
                    type="number"
                    placeholder="10000"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                  />

                  <NeonButton
                    className="w-full"
                    onClick={handleDeposit}
                    loading={isPending}
                    disabled={!depositAmount}
                  >
                    <ArrowDownToLine className="w-4 h-4 mr-2" />
                    Deposit to Treasury
                  </NeonButton>
                </div>
              </TerminalWindow>

              {/* Employee List */}
              <TerminalWindow title="employees" headerColor="magenta">
                <div className="space-y-2">
                  {mockEmployees.map((emp) => (
                    <button
                      key={emp.address}
                      onClick={() => setSelectedEmployee(emp.address)}
                      className={`w-full text-left p-3 rounded border transition-all ${
                        selectedEmployee === emp.address
                          ? "border-vapor-cyan bg-vapor-cyan/10"
                          : "border-vapor-border hover:border-vapor-border-light"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Users className="w-4 h-4 text-vapor-muted" />
                        <div>
                          <div className="font-mono text-sm text-vapor-foreground">
                            {emp.name}
                          </div>
                          <div className="font-mono text-xs text-vapor-muted">
                            {formatAddress(emp.address)}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </TerminalWindow>
            </div>

            {/* Middle Column - Payslip Composer */}
            <div className="lg:col-span-1">
              <TerminalWindow title="payslip_composer" headerColor="orange">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-vapor-muted font-orbitron mb-1">
                      Period
                    </label>
                    <select
                      value={selectedPeriod}
                      onChange={(e) => setSelectedPeriod(e.target.value)}
                      className="w-full h-10 px-3 rounded border border-vapor-border bg-vapor-bg font-mono text-vapor-cyan focus:outline-none focus:border-vapor-cyan"
                    >
                      <option value="202601">Jan 2026</option>
                      <option value="202602">Feb 2026</option>
                      <option value="202603">Mar 2026</option>
                    </select>
                  </div>

                  <TerminalInput
                    label="Base Salary (USDC)"
                    type="number"
                    placeholder="5000"
                    value={baseSalary}
                    onChange={(e) => setBaseSalary(e.target.value)}
                  />

                  <TerminalInput
                    label="Bonus (USDC)"
                    type="number"
                    placeholder="500"
                    value={bonus}
                    onChange={(e) => setBonus(e.target.value)}
                  />

                  <TerminalInput
                    label="Penalty (USDC)"
                    type="number"
                    placeholder="0"
                    value={penalty}
                    onChange={(e) => setPenalty(e.target.value)}
                  />

                  <TerminalInput
                    label="Unpaid Leave Deduction (USDC)"
                    type="number"
                    placeholder="0"
                    value={unpaidLeave}
                    onChange={(e) => setUnpaidLeave(e.target.value)}
                  />

                  <div className="pt-4 space-y-2">
                    <NeonButton
                      className="w-full"
                      variant="magenta"
                      onClick={handleSetPayslip}
                      loading={isPending}
                      disabled={!selectedEmployee}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Set Payslip Inputs
                    </NeonButton>

                    <NeonButton
                      className="w-full"
                      variant="outline"
                      onClick={handleCompute}
                      loading={isPending}
                      disabled={!selectedEmployee}
                    >
                      <Calculator className="w-4 h-4 mr-2" />
                      Compute Net Pay
                    </NeonButton>

                    <NeonButton
                      className="w-full"
                      onClick={handlePay}
                      loading={isPending}
                      disabled={!selectedEmployee}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Execute Payment
                    </NeonButton>
                  </div>
                </div>
              </TerminalWindow>
            </div>

            {/* Right Column - Activity Log */}
            <div>
              <TerminalWindow title="activity_log" headerColor="cyan" maximizable>
                <div className="h-[500px] overflow-y-auto space-y-1">
                  {activityLog.map((log, index) => (
                    <div
                      key={index}
                      className="font-mono text-xs text-vapor-foreground opacity-80"
                    >
                      <span className="text-vapor-cyan">$</span> {log}
                    </div>
                  ))}
                  <div className="font-mono text-xs text-vapor-cyan cursor-blink">
                    _
                  </div>
                </div>
              </TerminalWindow>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
