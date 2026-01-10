# PayWave Demo Script
**3-Minute Walkthrough**

---

## 🎬 Introduction (0:00 - 0:15)

> "Welcome to PayWave - the first confidential on-chain payroll system powered by Fully Homomorphic Encryption."

**Show:** Landing page at `/`

- Highlight the **Vaporwave aesthetic** - CRT scanlines, neon glows
- Point out the **three portals**: Issuer, Employee, Government
- Mention the **tagline**: "Public deposits, private distributions"

---

## 📥 Act 1: Issuer Deposits USDC (0:15 - 0:45)

> "Let's start as a company's HR administrator depositing payroll funds."

**Navigate to:** `/issuer` (Issuer Dashboard)

### Demo Steps:

1. **Connect Wallet** 
   - Click "Connect Wallet" in navbar
   - Approve MetaMask connection
   - Notice wallet address appears with checkmark

2. **Deposit to Treasury**
   - Locate "Deposit USDC" panel on left
   - Enter amount: `10000` USDC
   - Click "Deposit to Treasury"
   - Show transaction confirming
   - Treasury balance updates to `10,000.00 cUSDC`

> "Notice: USDC deposits are visible on-chain, but once wrapped to cUSDC, all subsequent operations are encrypted."

---

## 💼 Act 2: Create & Pay Payslip (0:45 - 1:30)

> "Now let's create an encrypted payslip for Alice, compute her net pay, and execute payment."

**Still on:** `/issuer`

### Demo Steps:

1. **Select Employee**
   - Find "Employees" list on right
   - Click on "Alice (alice.eth)" row
   - Her status should show "Active"

2. **Open Payslip Composer**
   - Payslip form should auto-populate
   - Show the fields:
     - Period: `2024-01`
     - Base Salary: `5000 cUSDC`
     - Bonus: `500 cUSDC`
     - Deductions: `450 cUSDC` (taxes + insurance)

3. **Submit Encrypted Inputs**
   - Click "Submit Inputs"
   - Transaction broadcasts → wait for confirmation
   - Status changes to "Inputs Set"

4. **Compute Net Pay**
   - Click "Compute Net Pay"
   - FHE computation runs on-chain (mocked for demo)
   - Net calculation: `5000 + 500 - 450 = 5050 cUSDC`
   - Status changes to "Computed"

5. **Execute Payment**
   - Click "Pay"
   - Treasury transfers encrypted cUSDC to Alice
   - Status changes to "Paid" ✓
   - Activity log shows: "Paid alice.eth for 2024-01"

> "The entire salary is now on-chain, but NOBODY except Alice can see the actual amounts!"

---

## 🔓 Act 3: Employee Decrypts Payslip (1:30 - 2:00)

> "Let's switch to Alice's perspective and decrypt her payslip."

**Navigate to:** `/employee` (Employee Portal)

### Demo Steps:

1. **Connect Alice's Wallet**
   - Disconnect issuer wallet if needed
   - Connect with Alice's address

2. **Select Pay Period**
   - Click "2024-01" from period list
   - Payslip card appears with encrypted values: "████████"

3. **Request Decryption**
   - Click "Decrypt My Payslip"
   - Sign message in MetaMask (proves ownership)
   - Watch reveal animation as values decrypt:
     - Base: `5,000.00 cUSDC`
     - Bonus: `500.00 cUSDC`
     - Deductions: `450.00 cUSDC`
     - **Net Pay: `5,050.00 cUSDC`**

4. **Local Verification**
   - Click "Verify Calculation"
   - Local computation confirms: `5000 + 500 - 450 = 5050` ✓
   - Toast: "Calculation verified! Your payslip is accurate."

> "Alice can verify the math herself - no need to trust anyone. This is confidential yet verifiable payroll."

---

## 🏛️ Act 4: Break-Glass Compliance (2:00 - 2:45)

> "Finally, let's see how government oversight works with our break-glass mechanism."

**Navigate to:** `/government` (Government Portal)

### Demo Steps:

1. **Create Compliance Case**
   - Fill in case request form:
     - Employee: `alice.eth`
     - Period: `2024-01`
     - Reason: "Tax audit investigation"
     - Evidence: `ipfs://QmEvidenceHash123`
   - Click "Request Case"
   - Case created with ID: `#1`

2. **Show Dual Approval Requirement**
   - Point out status: "Pending Approvals"
   - Two checkboxes needed:
     - [ ] Issuer Approval
     - [ ] Government Approval

3. **Approve as Issuer**
   - (In real demo: switch wallets)
   - Click "Approve as Issuer"
   - Status updates: ✓ Issuer Approved

4. **Approve as Government**
   - Click "Approve as Government"  
   - Status updates: ✓ Government Approved
   - **24-Hour Timelock Begins!**

5. **Show Timelock Countdown**
   - Large countdown timer appears: `23:59:45`
   - Explain: "This delay allows Alice to be notified and potentially contest"
   - Execute button is disabled until timelock expires

6. **(If demoing shortened timelock)**
   - After timelock expires
   - Click "Execute"
   - Access granted - government can now decrypt Alice's payslip
   - Event logged: "GovAccessGranted for alice.eth period 2024-01"

> "The break-glass mechanism ensures government can ONLY access data with:
> 1. Company approval
> 2. Their own approval
> 3. A 24-hour waiting period
> 
> This prevents abuse while enabling legitimate compliance."

---

## 🎤 Closing (2:45 - 3:00)

> "PayWave demonstrates that blockchain payroll can be:
> - **Transparent** where needed (deposits, audit trails)
> - **Private** where required (individual salaries)
> - **Compliant** with proper safeguards (break-glass)
>
> All powered by Fully Homomorphic Encryption on Zama's FHEVM."

**Show:** Return to landing page

> "Thank you! Questions?"

---

## 🔧 Demo Setup Checklist

Before presenting:

- [ ] Contracts deployed to testnet/local
- [ ] Frontend running on `localhost:3000`
- [ ] Two wallets configured (Issuer + Alice)
- [ ] MockUSDC minted to issuer wallet
- [ ] Browser in incognito mode (clean state)
- [ ] Screen recording ready (if recording)

### Quick Reset Commands

```bash
# Reset local node
cd contracts && npx hardhat node

# Redeploy contracts (new terminal)
npm run deploy

# Restart frontend
cd frontend && npm run dev
```

### Fallback Notes

If transactions fail:
- Check wallet connected to correct network
- Ensure sufficient gas (local testnet)
- Verify contract addresses in `.env.local`

If decryption doesn't work:
- This is a mock demo - show the UI flow
- Explain that real FHEVM would perform actual decryption

---

## 📊 Key Talking Points

| Feature | Privacy Win | Compliance Win |
|---------|-------------|----------------|
| Encrypted Salaries | ✅ Only employee sees amounts | N/A |
| Public Deposits | N/A | ✅ Auditable fund flows |
| ACL Decryption | ✅ Employee-controlled access | ✅ Court-ordered access possible |
| 24h Timelock | ✅ Notice period for employee | ✅ Process transparency |
| Dual Approval | ✅ Prevents unilateral abuse | ✅ Multi-party authorization |

---

*Demo script for PayWave - Confidential On-chain Payroll MVP*
