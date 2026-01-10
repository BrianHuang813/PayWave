"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/navbar";
import { TerminalWindow } from "@/components/ui/terminal-window";
import { NeonButton } from "@/components/ui/neon-button";
import { NeonCard } from "@/components/ui/neon-card";
import { useToast } from "@/components/ui/use-toast";
import {
  formatUSDC,
  formatAddress,
  formatPeriod,
  getStatusLabel,
  getStatusColor,
} from "@/lib/utils";
import { useAccount, useReadContract } from "wagmi";
import { PAYROLL_ABI, CUSDC_ABI } from "@/lib/contracts";
import { getContractAddress } from "@/lib/addresses";
import {
  Wallet,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  FileText,
  Calculator,
  Lock,
  Unlock,
  RefreshCw,
} from "lucide-react";

export default function EmployeePage() {
  const { address, isConnected, chainId } = useAccount();
  const { toast } = useToast();

  // UI States
  const [selectedPeriod, setSelectedPeriod] = React.useState("202601");
  const [isDecrypting, setIsDecrypting] = React.useState(false);
  const [decryptedData, setDecryptedData] = React.useState<{
    base: string;
    bonus: string;
    penalty: string;
    unpaidLeave: string;
    net: string;
  } | null>(null);

  // Contract addresses
  const payrollAddress = getContractAddress("payroll", chainId);
  const cusdcAddress = getContractAddress("cusdc", chainId);

  // Read payslip metadata
  const { data: payslipMeta, refetch: refetchMeta } = useReadContract({
    address: payrollAddress,
    abi: PAYROLL_ABI,
    functionName: "getPayslipMeta",
    args: address ? [address, parseInt(selectedPeriod)] : undefined,
    query: { enabled: !!address },
  });

  // Read encrypted balance handle
  const { data: balanceCipher } = useReadContract({
    address: cusdcAddress,
    abi: CUSDC_ABI,
    functionName: "balanceOfCipher",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Mock decryption function (in production, use fhevm JS SDK + relayer)
  const handleDecrypt = async () => {
    setIsDecrypting(true);
    
    try {
      // Simulate relayer decryption request
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock decrypted values (in production, these come from relayer)
      setDecryptedData({
        base: "5000.00",
        bonus: "500.00",
        penalty: "100.00",
        unpaidLeave: "200.00",
        net: "5200.00",
      });

      toast({
        title: "Decryption Complete",
        description: "Your payslip has been decrypted",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Decryption Failed",
        description: "Could not decrypt payslip",
        variant: "destructive",
      });
    } finally {
      setIsDecrypting(false);
    }
  };

  // Local verification of calculation
  const verifyCalculation = () => {
    if (!decryptedData) return { valid: false, message: "No data to verify" };

    const base = parseFloat(decryptedData.base);
    const bonus = parseFloat(decryptedData.bonus);
    const penalty = parseFloat(decryptedData.penalty);
    const unpaidLeave = parseFloat(decryptedData.unpaidLeave);
    const net = parseFloat(decryptedData.net);

    const gross = base + bonus;
    const deductions = penalty + unpaidLeave;
    const calculatedNet = Math.max(gross - deductions, 0);

    const isValid = Math.abs(calculatedNet - net) < 0.01;

    return {
      valid: isValid,
      gross: gross.toFixed(2),
      deductions: deductions.toFixed(2),
      calculatedNet: calculatedNet.toFixed(2),
      message: isValid
        ? "Calculation verified ✓"
        : "Calculation mismatch! Please contact HR.",
    };
  };

  const verification = decryptedData ? verifyCalculation() : null;

  const status = payslipMeta ? Number(payslipMeta[0]) : -1;

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
            Employee Portal
          </h1>
          <p className="text-vapor-muted">
            View and decrypt your confidential payslips
          </p>
        </motion.div>

        {!isConnected ? (
          <NeonCard className="max-w-md mx-auto text-center py-12">
            <Wallet className="w-16 h-16 mx-auto text-vapor-cyan mb-4" />
            <h2 className="font-orbitron text-xl font-semibold mb-2">
              Connect Wallet
            </h2>
            <p className="text-vapor-muted mb-4">
              Connect your wallet to view your payslips
            </p>
          </NeonCard>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* Left Column - Payslip Selection */}
            <div className="space-y-6">
              {/* Wallet Info */}
              <NeonCard accentColor="cyan">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-vapor-cyan/10">
                    <Wallet className="w-6 h-6 text-vapor-cyan" />
                  </div>
                  <div>
                    <div className="text-vapor-muted text-sm">Connected As</div>
                    <div className="font-mono text-vapor-cyan">
                      {formatAddress(address || "")}
                    </div>
                  </div>
                </div>
              </NeonCard>

              {/* Period Selector */}
              <TerminalWindow title="select_period" headerColor="cyan">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-vapor-muted font-orbitron mb-2">
                      Pay Period
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {["202601", "202602", "202603"].map((period) => (
                        <button
                          key={period}
                          onClick={() => {
                            setSelectedPeriod(period);
                            setDecryptedData(null);
                          }}
                          className={`p-3 rounded border text-center transition-all ${
                            selectedPeriod === period
                              ? "border-vapor-cyan bg-vapor-cyan/10 text-vapor-cyan"
                              : "border-vapor-border text-vapor-muted hover:border-vapor-border-light"
                          }`}
                        >
                          <div className="font-mono text-sm">
                            {formatPeriod(parseInt(period))}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payslip Status */}
                  <div className="p-4 rounded border border-vapor-border bg-vapor-bg-tertiary">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-vapor-muted text-sm">Status:</span>
                      <span
                        className={`font-mono text-sm ${getStatusColor(status)}`}
                      >
                        {status >= 0 ? getStatusLabel(status) : "NOT FOUND"}
                      </span>
                    </div>
                    {payslipMeta && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-vapor-muted text-sm">
                            Payslip ID:
                          </span>
                          <span className="font-mono text-sm text-vapor-foreground">
                            #{payslipMeta[2]?.toString() || "N/A"}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  <NeonButton
                    className="w-full"
                    onClick={() => refetchMeta()}
                    variant="outline"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Status
                  </NeonButton>
                </div>
              </TerminalWindow>

              {/* Decrypt Button */}
              <NeonButton
                className="w-full"
                size="lg"
                onClick={handleDecrypt}
                loading={isDecrypting}
                disabled={status < 1}
              >
                {decryptedData ? (
                  <>
                    <Eye className="w-5 h-5 mr-2" />
                    Re-decrypt Payslip
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5 mr-2" />
                    Decrypt My Payslip
                  </>
                )}
              </NeonButton>
            </div>

            {/* Right Column - Decrypted Payslip */}
            <div className="space-y-6">
              <TerminalWindow
                title={
                  decryptedData ? "payslip_decrypted" : "payslip_encrypted"
                }
                headerColor={decryptedData ? "cyan" : "magenta"}
              >
                {decryptedData ? (
                  <div className="space-y-4">
                    {/* Salary Breakdown */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-vapor-border">
                        <span className="text-vapor-muted">Base Salary</span>
                        <span className="font-mono text-vapor-success">
                          ${decryptedData.base}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-vapor-border">
                        <span className="text-vapor-muted">Bonus</span>
                        <span className="font-mono text-vapor-success">
                          +${decryptedData.bonus}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-vapor-border">
                        <span className="text-vapor-muted">Penalty</span>
                        <span className="font-mono text-vapor-error">
                          -${decryptedData.penalty}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-vapor-border">
                        <span className="text-vapor-muted">
                          Unpaid Leave Deduction
                        </span>
                        <span className="font-mono text-vapor-error">
                          -${decryptedData.unpaidLeave}
                        </span>
                      </div>
                    </div>

                    {/* Net Pay */}
                    <div className="p-4 rounded bg-vapor-cyan/10 border border-vapor-cyan/30">
                      <div className="flex justify-between items-center">
                        <span className="font-orbitron text-lg text-vapor-foreground">
                          Net Pay
                        </span>
                        <span className="font-orbitron text-2xl text-vapor-cyan text-neon-cyan">
                          ${decryptedData.net}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <EyeOff className="w-16 h-16 mx-auto text-vapor-muted mb-4" />
                    <p className="text-vapor-muted">
                      Your payslip is encrypted.
                      <br />
                      Click "Decrypt My Payslip" to view.
                    </p>
                  </div>
                )}
              </TerminalWindow>

              {/* Verification Box */}
              {verification && (
                <NeonCard
                  accentColor={verification.valid ? "cyan" : "orange"}
                >
                  <div className="flex items-start gap-4">
                    {verification.valid ? (
                      <CheckCircle className="w-6 h-6 text-vapor-success mt-1" />
                    ) : (
                      <XCircle className="w-6 h-6 text-vapor-error mt-1" />
                    )}
                    <div className="flex-1">
                      <h3 className="font-orbitron text-sm font-semibold mb-2">
                        Local Verification
                      </h3>
                      <div className="space-y-1 text-sm font-mono">
                        <div className="flex justify-between">
                          <span className="text-vapor-muted">Gross:</span>
                          <span className="text-vapor-foreground">
                            ${verification.gross}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-vapor-muted">Deductions:</span>
                          <span className="text-vapor-foreground">
                            ${verification.deductions}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-vapor-muted">
                            Calculated Net:
                          </span>
                          <span className="text-vapor-foreground">
                            ${verification.calculatedNet}
                          </span>
                        </div>
                      </div>
                      <p
                        className={`mt-3 text-sm ${
                          verification.valid
                            ? "text-vapor-success"
                            : "text-vapor-error"
                        }`}
                      >
                        {verification.message}
                      </p>
                    </div>
                  </div>
                </NeonCard>
              )}

              {/* Info Card */}
              <NeonCard accentColor="magenta" hoverable={false}>
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-vapor-magenta mt-0.5" />
                  <div>
                    <h3 className="font-orbitron text-sm font-semibold mb-1">
                      Privacy Protected
                    </h3>
                    <p className="text-vapor-muted text-sm">
                      Only you and your employer can decrypt your salary details.
                      No third party can access this information.
                    </p>
                  </div>
                </div>
              </NeonCard>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
