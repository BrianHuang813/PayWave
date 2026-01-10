"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/navbar";
import { TerminalWindow } from "@/components/ui/terminal-window";
import { TerminalInput } from "@/components/ui/terminal-input";
import { NeonButton } from "@/components/ui/neon-button";
import { NeonCard } from "@/components/ui/neon-card";
import { useToast } from "@/components/ui/use-toast";
import { formatAddress, formatPeriod, formatCountdown } from "@/lib/utils";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { COMPLIANCE_GATE_ABI } from "@/lib/contracts";
import { getContractAddress } from "@/lib/addresses";
import { keccak256, toBytes } from "viem";
import {
  Wallet,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Lock,
  Unlock,
  Eye,
  FileSearch,
  Gavel,
} from "lucide-react";

interface Case {
  id: number;
  employee: string;
  period: number;
  reasonHash: string;
  issuerApproved: boolean;
  govApproved: boolean;
  unlockTime: number;
  executed: boolean;
}

export default function GovernmentPage() {
  const { address, isConnected, chainId } = useAccount();
  const { toast } = useToast();
  const { writeContract, isPending } = useWriteContract();

  // Form states
  const [targetEmployee, setTargetEmployee] = React.useState("");
  const [targetPeriod, setTargetPeriod] = React.useState("202601");
  const [reason, setReason] = React.useState("");
  const [evidenceURI, setEvidenceURI] = React.useState("");

  // Selected case for actions
  const [selectedCaseId, setSelectedCaseId] = React.useState<number | null>(null);

  // Countdown timer
  const [countdown, setCountdown] = React.useState(0);

  // Mock cases for demo
  const [cases, setCases] = React.useState<Case[]>([
    {
      id: 1,
      employee: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      period: 202601,
      reasonHash: "0x1234...5678",
      issuerApproved: true,
      govApproved: true,
      unlockTime: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      executed: false,
    },
    {
      id: 2,
      employee: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      period: 202601,
      reasonHash: "0xabcd...ef01",
      issuerApproved: true,
      govApproved: false,
      unlockTime: Math.floor(Date.now() / 1000) + 86400,
      executed: false,
    },
  ]);

  // Contract address
  const gateAddress = getContractAddress("gate", chainId);

  // Countdown timer effect
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (selectedCaseId !== null) {
        const selectedCase = cases.find((c) => c.id === selectedCaseId);
        if (selectedCase) {
          const remaining = Math.max(
            0,
            selectedCase.unlockTime - Math.floor(Date.now() / 1000)
          );
          setCountdown(remaining);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedCaseId, cases]);

  const handleRequestCase = async () => {
    if (!targetEmployee || !reason) return;

    try {
      const reasonHash = keccak256(toBytes(reason));

      writeContract({
        address: gateAddress,
        abi: COMPLIANCE_GATE_ABI,
        functionName: "requestCase",
        args: [
          targetEmployee as `0x${string}`,
          parseInt(targetPeriod),
          reasonHash,
          evidenceURI,
        ],
      });

      toast({
        title: "Case Requested",
        description: "Compliance case has been created",
        variant: "success",
      });

      // Mock: Add to local state
      const newCase: Case = {
        id: cases.length + 1,
        employee: targetEmployee,
        period: parseInt(targetPeriod),
        reasonHash: reasonHash.slice(0, 10) + "...",
        issuerApproved: false,
        govApproved: false,
        unlockTime: Math.floor(Date.now() / 1000) + 86400,
        executed: false,
      };
      setCases([...cases, newCase]);

      // Reset form
      setTargetEmployee("");
      setReason("");
      setEvidenceURI("");
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to request case",
        variant: "destructive",
      });
    }
  };

  const handleApproveByGov = async (caseId: number) => {
    try {
      writeContract({
        address: gateAddress,
        abi: COMPLIANCE_GATE_ABI,
        functionName: "approveByGov",
        args: [BigInt(caseId)],
      });

      toast({
        title: "Approved",
        description: "Government approval submitted",
        variant: "success",
      });

      // Mock: Update local state
      setCases(
        cases.map((c) =>
          c.id === caseId ? { ...c, govApproved: true } : c
        )
      );
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve case",
        variant: "destructive",
      });
    }
  };

  const handleExecute = async (caseId: number) => {
    try {
      writeContract({
        address: gateAddress,
        abi: COMPLIANCE_GATE_ABI,
        functionName: "execute",
        args: [BigInt(caseId)],
      });

      toast({
        title: "Executed",
        description: "Access has been granted",
        variant: "success",
      });

      // Mock: Update local state
      setCases(
        cases.map((c) =>
          c.id === caseId ? { ...c, executed: true } : c
        )
      );
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to execute case",
        variant: "destructive",
      });
    }
  };

  const selectedCase = selectedCaseId
    ? cases.find((c) => c.id === selectedCaseId)
    : null;

  const canExecute = selectedCase
    ? selectedCase.issuerApproved &&
      selectedCase.govApproved &&
      countdown === 0 &&
      !selectedCase.executed
    : false;

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
            Government Portal
          </h1>
          <p className="text-vapor-muted">
            Break-glass compliance access with dual approval and timelock
          </p>
        </motion.div>

        {!isConnected ? (
          <NeonCard className="max-w-md mx-auto text-center py-12">
            <Wallet className="w-16 h-16 mx-auto text-vapor-magenta mb-4" />
            <h2 className="font-orbitron text-xl font-semibold mb-2">
              Connect Wallet
            </h2>
            <p className="text-vapor-muted mb-4">
              Connect government multisig wallet to access compliance portal
            </p>
          </NeonCard>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Create Case */}
            <div className="space-y-6">
              <TerminalWindow title="request_case" headerColor="magenta">
                <div className="space-y-4">
                  <TerminalInput
                    label="Employee Address"
                    placeholder="0x..."
                    value={targetEmployee}
                    onChange={(e) => setTargetEmployee(e.target.value)}
                  />

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-vapor-muted font-orbitron mb-1">
                      Target Period
                    </label>
                    <select
                      value={targetPeriod}
                      onChange={(e) => setTargetPeriod(e.target.value)}
                      className="w-full h-10 px-3 rounded border border-vapor-border bg-vapor-bg font-mono text-vapor-cyan focus:outline-none focus:border-vapor-magenta"
                    >
                      <option value="202601">Jan 2026</option>
                      <option value="202602">Feb 2026</option>
                      <option value="202603">Mar 2026</option>
                    </select>
                  </div>

                  <TerminalInput
                    label="Reason"
                    placeholder="Tax audit investigation..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />

                  <TerminalInput
                    label="Evidence URI (optional)"
                    placeholder="ipfs://..."
                    value={evidenceURI}
                    onChange={(e) => setEvidenceURI(e.target.value)}
                  />

                  <NeonButton
                    className="w-full"
                    variant="magenta"
                    onClick={handleRequestCase}
                    loading={isPending}
                    disabled={!targetEmployee || !reason}
                  >
                    <FileSearch className="w-4 h-4 mr-2" />
                    Request Access Case
                  </NeonButton>
                </div>
              </TerminalWindow>

              {/* Info Card */}
              <NeonCard accentColor="orange" hoverable={false}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-vapor-orange mt-0.5" />
                  <div>
                    <h3 className="font-orbitron text-sm font-semibold mb-1">
                      Break-Glass Protocol
                    </h3>
                    <ul className="text-vapor-muted text-sm space-y-1">
                      <li>• Requires Issuer + Gov approval</li>
                      <li>• 24-hour timelock period</li>
                      <li>• Access is logged on-chain</li>
                      <li>• Only specific payslip decryptable</li>
                    </ul>
                  </div>
                </div>
              </NeonCard>
            </div>

            {/* Middle Column - Case List */}
            <div>
              <TerminalWindow title="active_cases" headerColor="cyan">
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {cases.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCaseId(c.id)}
                      className={`w-full text-left p-4 rounded border transition-all ${
                        selectedCaseId === c.id
                          ? "border-vapor-cyan bg-vapor-cyan/10"
                          : "border-vapor-border hover:border-vapor-border-light"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-orbitron text-sm font-semibold">
                          Case #{c.id}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            c.executed
                              ? "bg-vapor-success/20 text-vapor-success"
                              : c.issuerApproved && c.govApproved
                              ? "bg-vapor-orange/20 text-vapor-orange"
                              : "bg-vapor-muted/20 text-vapor-muted"
                          }`}
                        >
                          {c.executed
                            ? "EXECUTED"
                            : c.issuerApproved && c.govApproved
                            ? "READY"
                            : "PENDING"}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="text-vapor-muted">
                          Employee: {formatAddress(c.employee)}
                        </div>
                        <div className="text-vapor-muted">
                          Period: {formatPeriod(c.period)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex items-center gap-1">
                          {c.issuerApproved ? (
                            <CheckCircle className="w-4 h-4 text-vapor-success" />
                          ) : (
                            <XCircle className="w-4 h-4 text-vapor-muted" />
                          )}
                          <span className="text-xs text-vapor-muted">Issuer</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {c.govApproved ? (
                            <CheckCircle className="w-4 h-4 text-vapor-success" />
                          ) : (
                            <XCircle className="w-4 h-4 text-vapor-muted" />
                          )}
                          <span className="text-xs text-vapor-muted">Gov</span>
                        </div>
                      </div>
                    </button>
                  ))}

                  {cases.length === 0 && (
                    <div className="text-center py-8 text-vapor-muted">
                      No active cases
                    </div>
                  )}
                </div>
              </TerminalWindow>
            </div>

            {/* Right Column - Case Details & Actions */}
            <div className="space-y-6">
              {selectedCase ? (
                <>
                  {/* Case Details */}
                  <TerminalWindow
                    title={`case_${selectedCase.id}`}
                    headerColor="orange"
                  >
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-vapor-muted">Employee:</span>
                          <span className="font-mono text-vapor-foreground">
                            {formatAddress(selectedCase.employee)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-vapor-muted">Period:</span>
                          <span className="font-mono text-vapor-foreground">
                            {formatPeriod(selectedCase.period)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-vapor-muted">Reason Hash:</span>
                          <span className="font-mono text-vapor-foreground">
                            {selectedCase.reasonHash}
                          </span>
                        </div>
                      </div>

                      {/* Approval Status */}
                      <div className="p-4 rounded bg-vapor-bg-tertiary border border-vapor-border">
                        <h4 className="font-orbitron text-sm mb-3">Approvals</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-vapor-muted">
                              Issuer Multisig
                            </span>
                            {selectedCase.issuerApproved ? (
                              <span className="flex items-center gap-1 text-vapor-success">
                                <CheckCircle className="w-4 h-4" />
                                Approved
                              </span>
                            ) : (
                              <span className="text-vapor-muted">Pending</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-vapor-muted">
                              Gov Multisig
                            </span>
                            {selectedCase.govApproved ? (
                              <span className="flex items-center gap-1 text-vapor-success">
                                <CheckCircle className="w-4 h-4" />
                                Approved
                              </span>
                            ) : (
                              <NeonButton
                                size="sm"
                                variant="outline-magenta"
                                onClick={() => handleApproveByGov(selectedCase.id)}
                                disabled={selectedCase.govApproved}
                              >
                                Approve
                              </NeonButton>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </TerminalWindow>

                  {/* Timelock Countdown */}
                  <NeonCard
                    accentColor={countdown === 0 ? "cyan" : "orange"}
                  >
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Clock className="w-5 h-5 text-vapor-orange" />
                        <span className="font-orbitron text-sm">
                          Timelock Countdown
                        </span>
                      </div>
                      <div className="font-mono text-3xl text-vapor-cyan text-neon-cyan">
                        {countdown > 0 ? formatCountdown(countdown) : "UNLOCKED"}
                      </div>
                      {countdown > 0 && (
                        <div className="mt-2 h-2 bg-vapor-bg-tertiary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-vapor-orange transition-all duration-1000"
                            style={{
                              width: `${Math.min(
                                100,
                                (countdown / 86400) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </NeonCard>

                  {/* Execute Button */}
                  <NeonButton
                    className="w-full"
                    size="lg"
                    onClick={() => handleExecute(selectedCase.id)}
                    loading={isPending}
                    disabled={!canExecute}
                  >
                    {selectedCase.executed ? (
                      <>
                        <Eye className="w-5 h-5 mr-2" />
                        Access Granted - Decrypt
                      </>
                    ) : canExecute ? (
                      <>
                        <Unlock className="w-5 h-5 mr-2" />
                        Execute Access
                      </>
                    ) : (
                      <>
                        <Lock className="w-5 h-5 mr-2" />
                        {!selectedCase.issuerApproved || !selectedCase.govApproved
                          ? "Awaiting Approvals"
                          : countdown > 0
                          ? "Timelock Active"
                          : "Execute Access"}
                      </>
                    )}
                  </NeonButton>
                </>
              ) : (
                <NeonCard className="text-center py-12">
                  <Gavel className="w-16 h-16 mx-auto text-vapor-muted mb-4" />
                  <p className="text-vapor-muted">
                    Select a case to view details
                  </p>
                </NeonCard>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
