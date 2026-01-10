// Contract ABIs for PayWave

export const USDC_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "mint",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

export const WRAPPER_ABI = [
  {
    name: "deposit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "recipient", type: "address" },
    ],
    outputs: [],
  },
  {
    name: "withdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "recipient", type: "address" },
    ],
    outputs: [],
  },
  {
    name: "totalLocked",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "event",
    name: "Deposited",
    inputs: [
      { name: "depositor", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "recipient", type: "address", indexed: true },
    ],
  },
] as const;

export const PAYROLL_ABI = [
  {
    name: "setPayslipInputs",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "employee", type: "address" },
      { name: "period", type: "uint32" },
      { name: "packedCiphertext", type: "bytes" },
      { name: "inputProof", type: "bytes" },
      { name: "policyHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    name: "computePayslip",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "employee", type: "address" },
      { name: "period", type: "uint32" },
    ],
    outputs: [],
  },
  {
    name: "pay",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "employee", type: "address" },
      { name: "period", type: "uint32" },
    ],
    outputs: [],
  },
  {
    name: "getPayslipMeta",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "employee", type: "address" },
      { name: "period", type: "uint32" },
    ],
    outputs: [
      { name: "status", type: "uint8" },
      { name: "policyHash", type: "bytes32" },
      { name: "payslipId", type: "uint256" },
      { name: "createdAt", type: "uint256" },
      { name: "computedAt", type: "uint256" },
      { name: "paidAt", type: "uint256" },
    ],
  },
  {
    name: "getPayslipCipher",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "employee", type: "address" },
      { name: "period", type: "uint32" },
    ],
    outputs: [
      { name: "base", type: "uint256" },
      { name: "bonus", type: "uint256" },
      { name: "penalty", type: "uint256" },
      { name: "unpaidLeaveDeduct", type: "uint256" },
      { name: "net", type: "uint256" },
    ],
  },
  {
    name: "issuerMultisig",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    name: "govMultisig",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "event",
    name: "PayslipInputsSet",
    inputs: [
      { name: "employee", type: "address", indexed: true },
      { name: "period", type: "uint32", indexed: true },
      { name: "policyHash", type: "bytes32", indexed: false },
      { name: "payslipId", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PayslipComputed",
    inputs: [
      { name: "employee", type: "address", indexed: true },
      { name: "period", type: "uint32", indexed: true },
      { name: "payslipId", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PayslipPaid",
    inputs: [
      { name: "employee", type: "address", indexed: true },
      { name: "period", type: "uint32", indexed: true },
      { name: "payslipId", type: "uint256", indexed: false },
      { name: "paymentRef", type: "bytes32", indexed: false },
    ],
  },
] as const;

export const COMPLIANCE_GATE_ABI = [
  {
    name: "requestCase",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "employee", type: "address" },
      { name: "period", type: "uint32" },
      { name: "reasonHash", type: "bytes32" },
      { name: "evidenceURI", type: "string" },
    ],
    outputs: [{ name: "caseId", type: "uint256" }],
  },
  {
    name: "approveByIssuer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "caseId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "approveByGov",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "caseId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "execute",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "caseId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "getCase",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "caseId", type: "uint256" }],
    outputs: [
      { name: "employee", type: "address" },
      { name: "period", type: "uint32" },
      { name: "reasonHash", type: "bytes32" },
      { name: "evidenceURI", type: "string" },
      { name: "issuerApproved", type: "bool" },
      { name: "govApproved", type: "bool" },
      { name: "createdAt", type: "uint256" },
      { name: "unlockTime", type: "uint256" },
      { name: "executed", type: "bool" },
    ],
  },
  {
    name: "canExecute",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "caseId", type: "uint256" }],
    outputs: [{ type: "bool" }],
  },
  {
    name: "getTimelockRemaining",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "caseId", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "TIMELOCK_DURATION",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "event",
    name: "CaseRequested",
    inputs: [
      { name: "caseId", type: "uint256", indexed: true },
      { name: "employee", type: "address", indexed: true },
      { name: "period", type: "uint32", indexed: true },
      { name: "reasonHash", type: "bytes32", indexed: false },
      { name: "evidenceURI", type: "string", indexed: false },
      { name: "unlockTime", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "CaseApproved",
    inputs: [
      { name: "caseId", type: "uint256", indexed: true },
      { name: "approverType", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "CaseExecuted",
    inputs: [
      { name: "caseId", type: "uint256", indexed: true },
      { name: "employee", type: "address", indexed: true },
      { name: "period", type: "uint32", indexed: true },
      { name: "govMultisig", type: "address", indexed: false },
    ],
  },
] as const;

export const CUSDC_ABI = [
  {
    name: "balanceOfCipher",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "hasBalance",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "bool" }],
  },
] as const;
