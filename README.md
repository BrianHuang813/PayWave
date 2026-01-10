# PayWave - Confidential On-chain Payroll

<p align="center">
  <img src="./docs/paywave-logo.png" alt="PayWave Logo" width="200">
</p>

**Privacy-preserving payroll powered by Fully Homomorphic Encryption (FHE) on blockchain.**

PayWave enables companies to pay employees on-chain while keeping salary information completely confidential. Only authorized parties can decrypt salary details.

## 🌟 Features

- **🔐 Confidential Salaries** - All salary components (base, bonus, deductions, net pay) are encrypted on-chain
- **💰 Public Deposits, Private Distributions** - USDC deposits are visible, but individual salary payments remain encrypted
- **✅ Employee Verification** - Employees can decrypt and verify their own pay calculations
- **🏛️ Break-Glass Compliance** - Government access requires dual approval (issuer + gov) + 24-hour timelock
- **🎨 Vaporwave UI** - Retro-futuristic design with CRT scanlines, neon glows, and terminal aesthetics

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PayWave System                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────┐    ┌───────────┐    ┌───────────┐              │
│  │   USDC    │───▶│  Wrapper  │───▶│   cUSDC   │              │
│  │ (Public)  │    │           │    │(Encrypted)│              │
│  └───────────┘    └───────────┘    └─────┬─────┘              │
│                                          │                      │
│                   ┌──────────────────────▼───────────────┐     │
│                   │           Payroll Contract            │     │
│                   │  • Encrypted payslip storage         │     │
│                   │  • FHE net pay computation           │     │
│                   │  • Confidential payments             │     │
│                   │  • ACL-based decryption rights       │     │
│                   └──────────────────────┬───────────────┘     │
│                                          │                      │
│  ┌───────────────┐    ┌─────────────────▼────────────────┐    │
│  │   Treasury    │◀───│      ComplianceGate              │    │
│  │  (cUSDC)      │    │  • Break-glass mechanism         │    │
│  └───────────────┘    │  • Dual approval required        │    │
│                        │  • 24h timelock                  │    │
│                        └─────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
paywave/
├── contracts/               # Solidity smart contracts
│   ├── src/
│   │   ├── Payroll.sol           # Core payroll logic
│   │   ├── PayrollTreasury.sol   # Treasury holding cUSDC
│   │   ├── cUSDC.sol             # Confidential USDC token
│   │   ├── USDCWrapper.sol       # USDC ↔ cUSDC wrapper
│   │   ├── ComplianceGate.sol    # Break-glass mechanism
│   │   ├── MockUSDC.sol          # Test token
│   │   └── lib/
│   │       ├── FHEVM.sol         # FHE operations interface
│   │       └── Errors.sol        # Custom errors
│   ├── test/
│   │   └── PayWave.test.ts       # Comprehensive tests
│   └── scripts/
│       └── deploy.ts             # Deployment script
│
├── frontend/                # Next.js frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # Landing page
│   │   │   ├── issuer/           # Issuer dashboard
│   │   │   ├── employee/         # Employee portal
│   │   │   └── government/       # Government portal
│   │   ├── components/
│   │   │   ├── ui/               # Reusable UI components
│   │   │   ├── navbar.tsx
│   │   │   └── providers.tsx
│   │   └── lib/
│   │       ├── contracts.ts      # Contract ABIs
│   │       ├── addresses.ts      # Contract addresses
│   │       └── utils.ts          # Utilities
│   └── tailwind.config.ts        # Vaporwave theme
│
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- MetaMask or compatible wallet

### 1. Clone and Install

```bash
git clone <repo-url>
cd paywave

# Install dependencies
npm install
```

### 2. Deploy Contracts (Local)

```bash
# Start local Hardhat node
cd contracts
npx hardhat node

# In another terminal, deploy contracts
npm run deploy

# Note the deployed addresses from output
```

### 3. Configure Frontend

```bash
cd frontend
cp .env.example .env.local

# Edit .env.local with deployed contract addresses
```

### 4. Run Frontend

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔧 Environment Variables

### Contracts (`contracts/.env`)

```env
PRIVATE_KEY=your_private_key
FHEVM_RPC_URL=https://devnet.zama.ai
CHAIN_ID=9000
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545

NEXT_PUBLIC_USDC_ADDRESS=0x...
NEXT_PUBLIC_CUSDC_ADDRESS=0x...
NEXT_PUBLIC_WRAPPER_ADDRESS=0x...
NEXT_PUBLIC_TREASURY_ADDRESS=0x...
NEXT_PUBLIC_PAYROLL_ADDRESS=0x...
NEXT_PUBLIC_GATE_ADDRESS=0x...

NEXT_PUBLIC_RELAYER_URL=http://localhost:3001
```

## 📝 Contract API

### Payroll Flow

1. **Deposit USDC** → `USDCWrapper.deposit(amount, treasury)`
2. **Set Payslip** → `Payroll.setPayslipInputs(employee, period, ciphertext, proof, policyHash)`
3. **Compute Net** → `Payroll.computePayslip(employee, period)`
4. **Pay Employee** → `Payroll.pay(employee, period)`

### Break-Glass Flow

1. **Request Case** → `ComplianceGate.requestCase(employee, period, reasonHash, evidenceURI)`
2. **Issuer Approval** → `ComplianceGate.approveByIssuer(caseId)`
3. **Gov Approval** → `ComplianceGate.approveByGov(caseId)`
4. **Wait Timelock** → 24 hours
5. **Execute** → `ComplianceGate.execute(caseId)`

## 🧪 Testing

```bash
cd contracts
npm test
```

Test coverage includes:
- ✅ Happy path: deposit → inputs → compute → pay
- ✅ Break-glass: request → approvals → timelock → execute
- ✅ Access control: role-based restrictions
- ✅ Edge cases: invalid periods, double payments, etc.

## 🎨 Design System

PayWave uses a **Vaporwave/Outrun** design language:

| Token | Value |
|-------|-------|
| Background | `#090014` |
| Foreground | `#E0E0E0` |
| Magenta | `#FF00FF` |
| Cyan | `#00FFFF` |
| Orange | `#FF9900` |
| Border | `#2D1B4E` |

**Fonts:**
- Headings: Orbitron
- Body/UI: Share Tech Mono

**Effects:**
- CRT scanlines overlay
- Neon glow shadows
- Perspective grid backgrounds
- Skewed button hover states

## 🔒 Security Considerations

- **No Public Decryption**: Salary amounts are NEVER publicly decryptable
- **ACL Enforcement**: Only authorized addresses can decrypt specific payslips
- **Timelock Protection**: 24-hour delay prevents rushed government access
- **Event Privacy**: Events emit IDs and hashes, never salary amounts
- **Role Gating**: Critical functions require multisig authorization

## 🗺️ Roadmap

- [ ] Integration with real FHEVM testnet
- [ ] Production relayer for user decryption
- [ ] Multi-period batch payments
- [ ] Tax withholding calculations
- [ ] Audit trail export for compliance
- [ ] Mobile-responsive UI improvements

## 📄 License

MIT License

## 🙏 Acknowledgments

- [Zama](https://zama.ai/) - FHEVM technology
- [shadcn/ui](https://ui.shadcn.com/) - UI component patterns
- [Framer Motion](https://www.framer.com/motion/) - Animations

---

**Built with ❤️ and FHE for privacy-preserving payroll**
