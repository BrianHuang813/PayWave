# VaporPay / PayWave — Zama Protocol FHEVM 正式 SDK 遷移指引（給 Claude Opus 4.5）

> 目的：把目前「模擬 FHE」的智能合約與前端流程，遷移成 **Zama Protocol 官方 SDK**（FHEVM Solidity v0.9 + Relayer SDK + Hardhat plugin）的正式做法。  
> 核心需求不變：**USDC 入金公開、發薪金額與明細全程保密、員工只能看自己的、政府需 break-glass 才能解密指定期別（非公開解密）**。

---

## 1) 先鎖版本與工具鏈（避免相容性地雷）

請先把依賴升到官方建議的最低版本（或更高同主版）：

- `@fhevm/solidity` ≥ `v0.9.1`
- `@zama-fhe/relayer-sdk` ≥ `v0.3.0-5`
- `@fhevm/hardhat-plugin` ≥ `v0.3.0-1`

**重要提醒：**
- Hardhat plugin 的 **Hardhat in-memory 預設網路是 mock encryption（不是真加密）**：可用於單元測試/CI，但不是 end-to-end 正式流程。
- 要驗證「正式 ZKPoK encrypted inputs + relayer + user decryption」，必須跑到對應測試網/可用環境模式（依你們部署環境設定）。

---

## 2) 合約端遷移：從「模擬 FHE」到「官方 FHEVM」

### 2.1 必做：使用官方 encrypted types + 正式 config

**要做：**
- 把敏感資料（薪資明細、net pay、保密代幣餘額）改為官方 encrypted types，例如 `euint64`（MVP 先用 `euint64` 很合理）。
- 移除任何 mock/stub 的 `encrypt()/decrypt()`、`fakeCipher()`、`simulateFHE()`。
- 合約引入官方 FHE library（如 `import { FHE, euint64, ebool, ... } ...`），並繼承官方 config（例如 `ZamaEthereumConfig`）。

**你會看到的典型改動：**
- `uint64 baseSalary` -> `euint64 baseSalary`
- `if (cond)` -> `FHE.select(cond, a, b)`
- `require(x >= y)`（若 x,y 是密文）-> 改成先用 select 算出結果，或改走非同步/外部驗證流程（MVP 儘量避免需公開 revert 的 confidential condition）。

---

### 2.2 敏感輸入必須走「Encrypted inputs + ZKPoK」

你們 Issuer 上傳的：base/bonus/penalty/unpaid_leave_deduct…都屬敏感資料，**必須走 encrypted inputs**：

**合約函式參數改為：**
- `externalEuintXX`（或 externalEbool/externalEaddress）
- `bytes inputProof`

**合約內部必做：**
- 用 `FHE.fromExternal(...)` 或 `FHE.asEuintXX/asEbool/asEaddress` 對外部輸入做 **驗證 + 轉型**，才能安全落入狀態與參與運算。

**規則：**
- 外部傳入的每個 encrypted 參數通常是「proof 內的 handle/index」，不是 ciphertext 本體；`inputProof` 是一包。

---

### 2.3 ACL（Access Control List）是正式 FHE 的生命線：每個新 ciphertext 都要重新授權

你們的產品需求是「員工只能看自己、政府需 break-glass 才能看指定 payslip」，因此 ACL 一定要做對。

**必懂 3 個操作：**
- `FHE.allow(ciphertext, addr)`：永久授權（該 addr 可用/可解密）
- `FHE.allowTransient(ciphertext, addr)`：只在本交易有效（適合把 ciphertext 暫時交給另一合約做一次運算/transfer）
- `FHE.allowThis(ciphertext)`：授權給 `address(this)` 的語法糖（讓合約下次還能用該 ciphertext）

#### 實務規則（請嚴格遵守）
1) **任何產生新 ciphertext 的狀態更新後，立即：**
   - `FHE.allowThis(newCipher)`（合約未來可續用）
2) **任何屬於某使用者的密文資料（payslip/餘額），立即：**
   - `FHE.allow(newCipher, userAddr)`（讓 user 能做 user-decrypt）
3) **要把 `netPayCipher` 提供給 `cUSDC` 做保密轉帳：**
   - 在 Payroll 內先 `FHE.allowTransient(netPayCipher, address(cUSDC))`
   - 再呼叫 `cUSDC.transferEncryptedFrom(treasury, employee, netPayCipher)`（語意）

#### 安全補強（避免推理攻擊）
- 若某函式接受 caller 提供的 encrypted amount/ciphertext（例如 transfer amount）：
  - 必須用 `FHE.isSenderAllowed(amountCipher)` 檢查 caller 是否對該 ciphertext 有權限
  - 避免攻擊者用「成功/失敗」行為側推別人的隱私餘額或數值。

---

### 2.4 邏輯分支：不能 `if (ebool)`，要用 `FHE.select`

**必做：**
- 所有 `ebool` 條件改用 `FHE.select(cond, a, b)` 來產生結果
- 禁止 `if (condEbool) { ... } else { ... }`

範例（語意）：
- `net = (gross >= deduct) ? gross - deduct : 0`
- 改成：
  - `cond = FHE.ge(gross, deduct)`
  - `net = FHE.select(cond, FHE.sub(gross, deduct), FHE.asEuint64(0))`

---

## 3) 前端 / 腳本：把「假加密/假解密」改成 Relayer SDK 正式流程

### 3.1 送交易前：建立 encrypted inputs（兩條路徑）

#### A) 測試用（Hardhat plugin）
- 用 `createEncryptedInput(contractAddr, userAddr)` 建 inputs
- `add64/addBool/...`
- `encrypt()` 拿到 `{ handles[], inputProof }`
- 呼叫合約函式：傳 `handles[i]`（對應 externalEuint）+ `inputProof`

> 這條路徑適合單元測試與開發；但注意 in-memory network 可能是 mock encryption。

#### B) 真正前端用（Relayer SDK）
- 用 `@zama-fhe/relayer-sdk` 取得 instance
- `instance.createEncryptedInput(contractAddr, userAddr)`
- `add64/...` -> `encrypt()` 得 `{ handles[], inputProof }`
- 用相同方式送入合約：`externalEuintXX` + `inputProof`

---

### 3.2 員工「只看自己的」：User Decryption（最重要）

**官方 user decryption 的核心流程：**
1) 合約提供 view 函式回傳 ciphertext handle，例如：
   - `balanceOfCipher(owner) returns (euint64)`
   - `getPayslipCipher(employee, period) returns (handles...)`
2) 合約端必須對該 ciphertext 做 ACL：
   - `FHE.allow(cipher, employeeAddr)`（沒有這步，userDecrypt 一定失敗）
   - `FHE.allowThis(cipher)`（合約後續仍能使用）
3) 前端用 relayer-sdk：
   - 以 EIP-712 簽名授權
   - `userDecrypt(...)` 拿到「對使用者公鑰再加密」的結果
   - 在瀏覽器本地用 NaCl key 解密得到 plaintext

**限制：**
- 一次 userDecrypt 的 ciphertext 總 bit 長度通常不得超過 2048 bits（例如 euint64 是 64 bits，很安全）。

---

### 3.3 政府 break-glass 解密：只做「授權後的 user decrypt」，不要 Public Decryption

你們需求是「政府在特定條件下可解密，但不是公開解密」。

**正確做法：**
- `ComplianceGate.execute(caseId)` 成功後，由 Payroll 執行 ACL 授權：
  - `FHE.allow(payslipNetCipher, govMultisig)`（或政府端指定解密地址）
  - （可選）對 base/bonus/penalty/deduct 也 allow
  - 同時 `FHE.allowThis(...)` 保留合約權限
- 政府端前端走同樣 `userDecrypt` 流程得到 plaintext（只政府看得到）

**禁止：**
- 禁止用 `makePubliclyDecryptable` / `publicDecrypt` 來揭露薪資資料（那會讓任何人都能解密）。

---

## 4) 遷移落地清單（工程任務分解）

### 4.1 合約遷移任務
- [ ] 依賴升級到官方相容版本（見第 1 節）
- [ ] 替換所有 mock FHE：改用 `euint64/ebool` 與 `FHE.*` 運算
- [ ] `setPayslipInputs` 改為 encrypted inputs：`externalEuint64... + bytes inputProof`，合約內用 `fromExternal/asEuint` 驗證
- [ ] `computePayslip`：用 `FHE.select` 完成 `net = max(gross - deduct, 0)`
- [ ] `pay`：先 `allowTransient(net, cUSDC)`，再呼叫 `transferEncryptedFrom(...)`
- [ ] ACL 規則全面補齊：`allowThis` + `allow(user)` + break-glass `allow(gov)`
- [ ] 若存在「caller 提供 ciphertext amount」的入口：加入 `FHE.isSenderAllowed` 防推理攻擊
- [ ] 新增 view 函式回傳 ciphertext handles 給前端 userDecrypt 使用

### 4.2 前端/腳本遷移任務
- [ ] 以 relayer-sdk 建立 encrypted inputs：createEncryptedInput -> add -> encrypt -> {handles, inputProof}
- [ ] 所有敏感輸入全面改走 encrypted inputs（不再送明文）
- [ ] employee portal：用 userDecrypt 解密自己的 payslip/balance，並做本地驗算
- [ ] government portal：case execute 後，對被 allow 的 ciphertext 做 userDecrypt

### 4.3 測試策略
- [ ] 單元測試：可用 hardhat plugin 的 mock encryption 快速覆蓋（ACL/狀態機/權限/事件）
- [ ] 整合測試（至少 1 條）：跑到可用環境（或官方建議模式）驗證「encrypted inputs + relayer + userDecrypt」實際可行

---

## 5) Claude Opus 4.5 — 遷移專用 Agent Prompt（可直接貼）

```text
You are Claude Opus 4.5 acting as a senior smart contract engineer + full-stack engineer.

Mission:
Migrate the existing “mock/simulated FHE” implementation of our Confidential On-chain Payroll (PayWave/VaporPay) into the official Zama Protocol FHEVM SDK stack (Solidity v0.9 + Relayer SDK + Hardhat plugin).
You MUST preserve the product requirements:
- USDC deposit/withdraw amounts are public.
- Payroll distribution amounts + payslip details are confidential on-chain.
- Employees can ONLY decrypt their own data (user decryption).
- Government can decrypt ONLY under break-glass conditions (IssuerMultisig + GovMultisig approvals + timelock). This MUST be implemented via user decryption ACL grants, NOT public decryption.

Non-negotiable technical constraints (official docs):
- Use encrypted inputs with ZK proof: externalEuintXX/externalEbool + bytes inputProof; validate via FHE.fromExternal / FHE.asEuintXX.
- Use ACL correctly: after every ciphertext-producing assignment, call FHE.allowThis(newCipher). Also allow user-specific ciphertexts via FHE.allow(newCipher, user). Use FHE.allowTransient when temporarily passing a ciphertext to another contract within the same tx (e.g., netPayCipher -> cUSDC transfer).
- No `if (ebool)`: use FHE.select for confidential branching.
- For any function that accepts an encrypted amount from caller, use FHE.isSenderAllowed(amountCipher) to prevent inference attacks.

Step-by-step tasks:
1) Dependency + environment migration:
   - Upgrade to FHEVM v0.9 compatible versions (see official migration guide).
   - Ensure contracts inherit ZamaEthereumConfig (SepoliaConfig is removed).
   - Keep Hardhat plugin configured; note that default hardhat in-memory uses mock encryption, so add at least one end-to-end path using real encrypted inputs + relayer.

2) Contract refactor (replace mock FHE):
   - Replace plaintext salary/balance fields with euint64 (MVP).
   - Replace mock encryption/decryption stubs with FHE operations (FHE.add/sub/mul/select/lt/le/etc).
   - Change all sensitive function inputs to encrypted inputs (externalEuintXX + inputProof) and validate onchain.
   - Implement/verify ACL rules for:
     a) employees: allow ciphertexts to employee for userDecrypt
     b) government break-glass: allow ciphertexts to govMultisig ONLY after case execute
     c) contract itself: allowThis for re-use
     d) transient transfers: allowTransient(netPayCipher, address(cUSDC)) before calling transferEncryptedFrom
   - Provide view functions returning ciphertext handles for frontend userDecrypt (balanceOfCipher, payslipOfCipher).

3) Frontend / scripts migration:
   - Replace any “fake encrypt” with @zama-fhe/relayer-sdk createEncryptedInput(...) -> addXX -> encrypt() to obtain handles[] + inputProof.
   - Replace any “fake decrypt” with relayer-sdk userDecrypt flow (EIP-712 signature + NaCl keypair) to read employee-only data.
   - Implement gov portal decrypt similarly via userDecrypt, but only after ACL grant.

4) Testing:
   - Unit tests: ok to use hardhat in-memory mock encryption for fast coverage.
   - Add at least one integration test path that uses real encrypted inputs & relayer-compatible workflow.

Deliverables:
- Updated Solidity contracts compiling and passing tests.
- Updated TS/FE utilities for encrypted input creation + userDecrypt.
- A short “Migration Notes” doc describing what was changed and the ACL/decryption flows.

Do NOT:
- Do not use public decryption for payroll data.
- Do not leak any salary amounts in events/logs.
```

---

## 6) 專案命名（可選）
推薦：**VaporPay**（短、好記、與 Vaporwave/Outrun 風格一致）
