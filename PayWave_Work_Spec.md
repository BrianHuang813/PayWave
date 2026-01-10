# VaporPay / Confidential On-chain Payroll — 工作規格表（Smart Contracts + Frontend UI）

> 版本：MVP v1  
> 目的：提供可直接交付給工程 agent 開工的完整工作規格（合約介面 + 前端 UI/UX 設計），並附 Claude Opus 4.5 的 Agent 工作提示詞。

---

## 1) 專案前提與假設（寫死，避免開工歧義）

| 項目 | 決策 |
|---|---|
| Chain | Zama FHEVM 相容環境（testnet / devnet），支援 euint/ebool、ACL、user decryption、allowTransient |
| 資產 | 使用 **USDC（或測試網 MockUSDC）** 作為現實對齊的入金資產；支付在鏈上以 **保密包裝幣 cUSDC** 進行（密文 transfer amount、密文 balances） |
| 角色 | IssuerMultisig（公司 2-of-3）、GovMultisig（政府 2-of-2）、Employee EOA |
| 可視性 | 薪資明細與支付金額**全程保密**；旁觀者只能驗證流程與權限；員工只能看自己的；政府需 break-glass case 才能看指定員工指定期別 |
| Break-glass 條件 | **IssuerMultisig + GovMultisig 共同核准 + 24h timelock**，到期後才授權政府解密權限（非公開解密） |
| Period 定義 | `uint32 period = YYYYMM`（如 202601） |
| 金額單位 | 最小單位（例如 USDC 6 decimals 的 base unit），MVP 先用 `euint64` 保存（之後再優化位元降低成本） |

---

## 2) Smart Contract 工作規格表（介面/權限/事件/錯誤/ACL）

### 2.1 合約清單與責任邊界

| 合約 | 責任 |
|---|---|
| `Payroll` | 保存密文 payslip、密文計算 net、執行保密發薪、管理 payslip 的 ACL（employee/issuer/token transient/government） |
| `PayrollTreasury` | 持有 cUSDC；只允許 Payroll 以受控方式從 treasury 發薪 |
| `cUSDC` | 保密代幣：encrypted balances + encrypted transfer amount（實作可基於範例/模板） |
| `USDCWrapper` | 公開 USDC ↔ 保密 cUSDC 的包裝/解包：deposit/withdraw（金額公開，但發薪分配金額保密） |
| `ComplianceGate` | break-glass case 狀態機（request/approve/timelock/execute），到期後呼叫 Payroll 授權 gov 解密 |

> **多簽執行方式**：MVP 以「多簽錢包地址」作為 `issuerMultisig` / `govMultisig`，合約只做 `msg.sender` role gate（多簽內部怎麼簽、用 Safe 或自建多簽，不在 MVP 範圍）。

---

### 2.2 共用資料結構與錯誤碼

#### Payslip（在 Payroll）
**密文欄位（全加密）**
- `base`
- `bonus`
- `penalty`
- `unpaidLeaveDeduct`
- `net`

**明文欄位**
- `status`: `DRAFT=0`, `COMPUTED=1`, `PAID=2`, `VOID=3`（可選）
- `policyHash`: `bytes32`（該期規則版本，便於升級與稽核）

#### Case（在 ComplianceGate）
- `employee`, `period`
- `reasonHash`, `evidenceURI`
- `issuerApproved`, `govApproved`
- `unlockTime = createdAt + 24h`
- `executed`

#### 建議錯誤碼（所有合約統一）

| Error | 觸發條件 |
|---|---|
| `E_NOT_ISSUER` | 非 issuerMultisig 呼叫 issuer-only 函式 |
| `E_NOT_GOV` | 非 govMultisig 呼叫 gov-only 函式 |
| `E_NOT_GATE` | 非 ComplianceGate 呼叫 Payroll 的 grant 函式 |
| `E_INVALID_PERIOD` | period 格式不合法 |
| `E_PAYSPLIP_NOT_FOUND` | 找不到 payslip |
| `E_BAD_STATUS` | 狀態不允許（如未 computed 就 pay） |
| `E_ALREADY_PAID` | 重複支付 |
| `E_ALREADY_SET` | 重複設定 inputs（或 policy 不允許覆蓋） |
| `E_CASE_LOCKED` | timelock 未到 |
| `E_CASE_NOT_APPROVED` | 未達雙方核准 |
| `E_CASE_EXECUTED` | case 已執行 |
| `E_INSUFFICIENT_TREASURY` | treasury 餘額不足（保密餘額檢查策略見下） |

---

### 2.3 `Payroll` 介面規格表（最核心）

> 註：以下的 `packedCiphertext`/`inputProof` 是「外部加密輸入」常見模式；`euint64`/ciphertext handle 的具體型別依你的 FHEVM solidity library 而定，但規格在語意上固定。

#### A) Admin / Config

| 函式 | 權限 | 參數 | 前置條件 | 狀態變更 | 事件 | ACL 行為 |
|---|---|---|---|---|---|---|
| `setIssuer(address issuerMultisig)` | 部署者/Owner（MVP 可省略，寫死不可改） | issuerMultisig | 非 0 地址 | 更新 issuer | `IssuerUpdated` | 無 |
| `setGov(address govMultisig)` | Owner | govMultisig | 非 0 | 更新 gov | `GovUpdated` | 無 |
| `setComplianceGate(address gate)` | Owner | gate | 非 0 | 更新 gate | `GateUpdated` | 無 |
| `setTreasury(address treasury)` | Owner | treasury | 非 0 | 更新 treasury | `TreasuryUpdated` | 無 |
| `setToken(address cUSDC)` | Owner | cUSDC | 非 0 | 更新 token | `TokenUpdated` | 無 |

#### B) Payslip Inputs（issuer 產生密文輸入）

| 函式 | 權限 | 參數 | 前置條件 | 狀態變更 | 事件 | ACL 行為 |
|---|---|---|---|---|---|---|
| `setPayslipInputs(employee, period, packedCiphertext, inputProof, policyHash)` | IssuerMultisig | employee, period, packedCiphertext, inputProof, policyHash | period 合法；(employee,period) 不可已存在或依政策允許覆蓋 | 建立 payslip（status=DRAFT）+ 存密文欄位 | `PayslipInputsSet(employee, period, policyHash, payslipId)` | 允許 Payroll 合約持有/續用該密文欄位 handle（合約內部默認）；**不授權 employee 立即解密**（可選：也可立刻 allow 明細） |

> **設計選擇**：MVP 建議 `DRAFT` 階段先不讓員工解密，避免未算 net/未 pay 造成爭議；等 computed 後 allow（更合理）。

#### C) Compute（密文結算）

| 函式 | 權限 | 參數 | 前置條件 | 計算規則 | 狀態變更 | 事件 | ACL 行為 |
|---|---|---|---|---|---|---|---|
| `computePayslip(employee, period)` | IssuerMultisig | employee, period | payslip 存在；status=DRAFT | `gross=base+bonus`；`deduct=penalty+unpaidLeaveDeduct`；`net=select(gross>=deduct, gross-deduct, 0)` | 更新 net；status=COMPUTED | `PayslipComputed(employee, period, payslipId)` | `allow(net, employee)`；（可選）`allow(base/bonus/penalty/deduct, employee)`；`allow(net, Payroll)`（可重用）；**不做 publicly decryptable** |

#### D) Pay（保密發薪：transfer amount 保密）

| 函式 | 權限 | 參數 | 前置條件 | 狀態變更 | 事件 | ACL 行為 |
|---|---|---|---|---|---|---|
| `pay(employee, period)` | IssuerMultisig | employee, period | status=COMPUTED；未 PAID；treasury 足夠（見下） | status=PAID | `PayslipPaid(employee, period, payslipId, paymentRef)` | `allowTransient(net, cUSDC)`；呼叫 `cUSDC.transferEncryptedFrom(treasury, employee, net)`（語意） |

**Treasury 足夠的策略（MVP 取捨）**
- 方案 1（最快）：不在 Payroll 內做密文餘額檢查，讓 `cUSDC` 在 transfer 時處理（若不足回傳失敗/錯誤）。  
- 方案 2（更嚴謹）：`cUSDC` 提供「可驗證的密文餘額比較」或「明文上限管理」（較重，MVP 不建議）。

#### E) Read（查詢）

| 函式 | 權限 | 參數 | 回傳 | 說明 |
|---|---|---|---|---|
| `getPayslipMeta(employee, period)` | public | employee, period | status, policyHash, payslipId | 旁觀者可用來審計流程，但不含金額 |
| `getPayslipCipher(employee, period)` | public | employee, period | ciphertext handles（base/bonus/…/net） | 任何人可取 handle，但**沒 ACL 無法解密**（前端會用它發起 user-decrypt） |

#### F) Break-glass：授權政府解密（只 gate 可呼叫）

| 函式 | 權限 | 參數 | 前置條件 | 狀態變更 | 事件 | ACL 行為 |
|---|---|---|---|---|---|---|
| `grantGovAccess(employee, period, caseId)` | ComplianceGate only | employee, period, caseId | case 已通過（由 gate 保證）；payslip 存在 | 無（或記錄 grant 日誌） | `GovAccessGranted(employee, period, caseId, govMultisig)` | `allow(net, govMultisig)`；（可選）allow 明細欄位 |

---

### 2.4 `ComplianceGate` 介面規格表（break-glass 狀態機）

| 函式 | 權限 | 參數 | 前置條件 | 狀態變更 | 事件 |
|---|---|---|---|---|---|
| `requestCase(employee, period, reasonHash, evidenceURI)` | public（或只 gov） | employee, period, reasonHash, evidenceURI | period 合法 | 建立 case：unlockTime=now+24h | `CaseRequested(caseId, employee, period, reasonHash)` |
| `approveByIssuer(caseId)` | IssuerMultisig | caseId | case 存在；未 executed | issuerApproved=true | `CaseApproved(caseId, "ISSUER")` |
| `approveByGov(caseId)` | GovMultisig | caseId | case 存在；未 executed | govApproved=true | `CaseApproved(caseId, "GOV")` |
| `execute(caseId)` | public | caseId | issuerApproved && govApproved；now>=unlockTime；未 executed | executed=true；呼叫 Payroll.grantGovAccess | `CaseExecuted(caseId, employee, period, govMultisig)` |

---

### 2.5 `USDCWrapper` 介面規格表（公開入金，保密發薪）

| 函式 | 權限 | 參數 | 前置條件 | 狀態變更 | 事件 |
|---|---|---|---|---|---|
| `deposit(uint256 usdcAmount, address recipient)` | public | usdcAmount, recipient | user 已 approve USDC；amount>0 | 轉入 USDC；鑄造等額 cUSDC 給 recipient（通常 Treasury） | `Deposited(depositor, usdcAmount, recipient)` |
| `withdraw(uint256 usdcAmount, address recipient)` | public | usdcAmount, recipient | 呼叫者可燒 cUSDC；amount>0 | 燒 cUSDC；轉出 USDC 給 recipient | `Withdrawn(withdrawer, usdcAmount, recipient)` |

> 注意：deposit/withdraw 的 amount **公開**，但 **Payroll 內部發薪分配**以 cUSDC encrypted transfer 完成，分配金額不公開。

---

### 2.6 `cUSDC` 介面規格表（保密代幣）

> MVP 只要求「足以完成：wrapper 鑄造、treasury 持有、pay 時 transferEncryptedFrom、員工可 user-decrypt 看到自己的餘額/入帳」。

| 函式 | 權限 | 參數 | 說明 |
|---|---|---|---|
| `mint(address to, uint256 amount)` | Wrapper only | to, amount | amount 公開，內部轉為密文加到 `to` 的 encrypted balance |
| `burn(address from, uint256 amount)` | Wrapper only | from, amount | amount 公開，內部從密文餘額扣除（不足則 revert） |
| `transferEncryptedFrom(address from, address to, euint64 amountCipher)` | Payroll (或授權合約) | from, to, amountCipher | amountCipher 由 Payroll computed net 提供；需搭配 `allowTransient(amountCipher, cUSDC)` |
| `balanceOfCipher(address owner)` | public | owner | 回傳 owner 的 ciphertext handle（前端 user-decrypt 用） |
| `allowance/approve` | 可選 |  | MVP 可省略，因為 payroll 從 treasury 發薪是 role-gated |

---

## 3) Frontend UI / 網頁設計 工作規格表（Vaporwave / Outrun）

> 將設計提示詞轉為可執行 UI 工單：先建立現況心智模型 → 提問 → 設計 token → 元件架構 → 頁面/狀態 → 可用性/無障礙 → 動效與一致性。

### 3.1 前端技術棧（先定 MVP；若現有 repo 不同需回報並對齊）

| 項目 | MVP 預設 |
|---|---|
| Framework | Next.js (App Router) + React |
| Styling | Tailwind CSS |
| Components | shadcn/ui（只用作基礎行為，視覺用 Vaporwave tokens 覆蓋） |
| Animations | Framer Motion（小量，用於 hover/glitch/pulse） |
| Web3 | ethers / viem（擇一）+ wagmi（可選） |
| FHE client | fhevm JS SDK（加密輸入、user decryption 流程） |
| Relayer | MVP 先做「可配置的 relayer endpoint」，並提供 local mock 模式 |

---

### 3.2 全域設計系統落地（必做清單）

| 類別 | 工作項 | 驗收標準 |
|---|---|---|
| Tokens | 建立顏色/字體/陰影/邊框/間距 tokens（Dark mode only） | 全站不出現隨意硬編碼色票；由 tokens 統一管理 |
| Fonts | 引入 Orbitron（heading）與 Share Tech Mono（body/UI） | Hero/標題明顯是 Orbitron；按鈕/輸入是 monospace |
| Global FX | CRT scanlines overlay + RGB aberration overlay | 全站固定層，滾動不跑位；不影響可讀性（opacity 控制） |
| Background | Infinite grid / floating sun / dot patterns | 至少 landing/issuer 頁要有 grid + sun |
| Components | Neon button、terminal window card、terminal input、dual-border cards | 按鈕 hover 會“戲劇化”（skew→unskew、glow 放大、invert） |
| A11y | 對比、焦點、鍵盤操作、aria | focus ring 用 cyan；表單錯誤提示可讀；所有互動元素可 tab |

---

### 3.3 資訊架構 IA（3 Portal + Landing）

#### 0) Landing / Home（可選但強烈建議：builder event 好講故事）

| 區塊 | 內容 | 互動/動效 |
|---|---|---|
| Hero | 「Confidential Payroll on-chain」+ gradient text | 背景 sun + grid；標題 glow；CTA 按鈕 skew hover |
| How it works | 4 steps timeline（Deposit→Set Inputs→Compute→Pay→Decrypt / Audit） | alternating timeline，checkpoint glow |
| Trust / Policy | “Only issuer+employee can see” “Break-glass for authority” | terminal-style bullets `>` |

#### 1) Issuer Dashboard（HR/Finance）
**目的**：存入 USDC、產生 payslip、計算、保密發薪、查看狀態

| 模組 | UI 元件 | 資料/動作 | 狀態 |
|---|---|---|---|
| Deposit Panel | Terminal Window + amount input + “Deposit USDC → Treasury” | 呼叫 `USDCWrapper.deposit(amount, Treasury)` | pending/success/error |
| Employee Table | File Explorer Window（列表） | 顯示 employee、period、status、actions | empty/loading |
| Payslip Composer | Terminal form（base/bonus/penalty/leave） | 前端加密→ `setPayslipInputs` | draft saved |
| Compute & Pay | CTA buttons | `computePayslip`、`pay` | disabled by status |
| Activity Log | IRC/terminal log | 事件流：InputsSet/Computed/Paid | realtime |

#### 2) Employee Portal
**目的**：只能看自己的 payslip 與入帳（解密 + 驗算）

| 模組 | UI 元件 | 資料/動作 | 狀態 |
|---|---|---|---|
| Wallet Header | address pill + “connected” neon | 連錢包 | disconnected |
| Payslip Selector | period dropdown | 選期別 | no records |
| Decrypt Panel | “> decrypt my payslip” terminal button | 呼叫 relayer user-decrypt（base/bonus/deduct/net） | decrypting |
| Verification Box | 顯示本地重算結果（gross/deduct/net）與鏈上狀態 | 本地公式驗算 | pass/fail |
| Balance Panel | decrypt cUSDC balance（可選） | `cUSDC.balanceOfCipher` + user-decrypt | decrypting |

#### 3) Government Portal（Break-glass）
**目的**：建立 case、雙簽核准狀態、timelock 倒數、到期後解密指定 payslip

| 模組 | UI 元件 | 資料/動作 | 狀態 |
|---|---|---|---|
| Case Creator | terminal form（employee, period, reasonHash, evidenceURI） | `requestCase` | created |
| Approvals | dual-signature status | 讀取 case issuerApproved/govApproved | waiting |
| Timelock Countdown | neon countdown bar | unlockTime - now | locked/unlocked |
| Execute & Decrypt | execute button + decrypt panel | `execute` → Payroll allow → user-decrypt | success |

---

### 3.4 元件清單（需可重用、避免一次性樣式）

| 元件 | 說明 | 必備特性 |
|---|---|---|
| `NeonButton` | primary/secondary/outline/ghost | skew→unskew hover、glow amplification、鍵盤 focus |
| `TerminalWindow` | 帶 title bar + 三色 dots | 可嵌入 form/table/log |
| `TerminalInput` | underline border、cyan text | placeholder magenta、focus cyan glow |
| `NeonCard` | dual-border + top accent | hover lift + stronger glow |
| `ScanlinesOverlay` | fixed overlay | opacity 可調，不干擾點擊 |
| `GridBackground` | perspective grid | 可在 section 使用，mobile 簡化但保留 |
| `GlitchText`（選配） | 小幅 glitch animation | 只用於 hero/重要標題 |

---

## 4) Claude Opus 4.5 — Agent 工作提示詞（照表完成全部任務）

> 直接貼給 Claude Opus 4.5 使用。

```text
You are Claude Opus 4.5 acting as a senior full-stack engineer + smart contract engineer + frontend engineer + UI/UX designer.

Goal:
Implement a Confidential On-chain Payroll MVP using Zama FHEVM concepts with:
- Public USDC deposit/withdraw via a wrapper
- Confidential cUSDC token for encrypted balances + encrypted transfer amounts
- Payroll contract that stores encrypted payslips, computes encrypted net pay, and pays employees in encrypted amounts
- Break-glass ComplianceGate: IssuerMultisig + GovMultisig approvals + 24h timelock, then grant government decryption access for a specific employee+period (NOT publicly decryptable)
- Frontend with Vaporwave/Outrun design system (dark-mode only), including Issuer Dashboard, Employee Portal, Government Portal (and optional Landing)

IMPORTANT PROCESS (do this before writing code):
1) Build a clear mental model of the existing codebase (if any):
   - Identify tech stack (Next.js/React/Tailwind/shadcn/ui or otherwise)
   - Identify existing design tokens, global styles, component patterns, folder naming
   - Identify constraints (legacy CSS, libs, build tool, bundling, etc.)
2) Ask focused questions ONLY if required to avoid blocking:
   - Confirm chain/testnet environment and available FHEVM solidity library + JS SDK version
   - Confirm whether we are starting from scratch or integrating into existing repo
   - Confirm preferred web3 stack (ethers vs viem) if repo already uses one
If no answers, proceed with best-effort defaults: Next.js App Router + Tailwind + shadcn/ui + viem.

IMPLEMENTATION PLAN (must be concise and maintainable):
- Centralize design tokens; create reusable components; avoid one-off styles; preserve accessibility; responsive layouts; theatrical hover states.
- Use Vaporwave/Outrun design system: CRT scanlines overlay, perspective grid, neon glows, gradient text fills, skewed buttons, terminal chrome.

SCOPE / WORK SPEC (must implement all):
A) Smart Contracts (Hardhat based):
1) Contracts:
   - Payroll
   - PayrollTreasury
   - USDCWrapper
   - cUSDC (confidential token)
   - ComplianceGate
2) Enforce role gating:
   - issuerMultisig address as issuer role
   - govMultisig address as gov role
   - complianceGate address allowed to call Payroll.grantGovAccess
3) Period format: uint32 YYYYMM
4) Payslip encrypted fields: base, bonus, penalty, unpaidLeaveDeduct, net (encrypted); status and policyHash (plaintext)
5) Payroll flow:
   - setPayslipInputs(employee, period, packedCiphertext, inputProof, policyHash)
   - computePayslip(employee, period): gross=base+bonus; deduct=penalty+unpaidLeaveDeduct; net=select(gross>=deduct, gross-deduct, 0)
   - pay(employee, period): allowTransient(net, cUSDC); cUSDC.transferEncryptedFrom(treasury, employee, net); status=PAID; emit events
6) Break-glass:
   - ComplianceGate requestCase/approveByIssuer/approveByGov/execute with 24h timelock
   - execute() calls Payroll.grantGovAccess(employee, period, caseId)
   - Payroll.grantGovAccess does ACL allow(net, govMultisig) (and optionally allow detail fields) WITHOUT publicly decryptable.
7) Wrapper:
   - deposit(usdcAmount, recipient): pull USDC (public), mint cUSDC to recipient (usually Treasury)
   - withdraw(usdcAmount, recipient): burn cUSDC, send USDC (public)
8) Events:
   - PayslipInputsSet, PayslipComputed, PayslipPaid, GovAccessGranted
   - CaseRequested, CaseApproved, CaseExecuted
9) Tests:
   - Happy path: deposit -> setInputs -> compute -> pay -> employee decrypt flow stubbed/mocked
   - Break-glass path: request -> approvals -> timelock -> execute -> gov decrypt permission
   - Access control negative tests

B) Frontend (Vaporwave/Outrun UI):
1) Pages:
   - /issuer: Issuer Dashboard
   - /employee: Employee Portal
   - /government: Government Portal
   - optional /: Landing with hero + how-it-works
2) Design system integration:
   - Dark mode only tokens: background #090014, foreground #E0E0E0, magenta #FF00FF, cyan #00FFFF, orange #FF9900, borders #2D1B4E
   - Fonts: Orbitron (headings), Share Tech Mono (body/UI)
   - Global CRT scanlines overlay and subtle RGB aberration
   - Perspective grid and floating sun background in key pages
   - Components: NeonButton, TerminalWindow, TerminalInput, NeonCard, ScanlinesOverlay, GridBackground
   - Theatrical hover states: unskew, glow amplification, invert colors, small motion
   - Accessibility: keyboard focus (cyan), readable contrast, aria labels for forms
3) Data flows:
   - Wallet connect
   - USDC deposit to treasury via wrapper
   - Create payslip: encrypt inputs client-side (packedCiphertext + inputProof) then send tx
   - Compute and Pay actions with status gating
   - Employee decrypt flow via relayer endpoint (configurable); show decrypted payslip and local verification
   - Government case flow: create/approve/execute then decrypt permitted payslip
4) UX states:
   - pending / success / error toast
   - empty states and disabled CTA rules
   - activity log styled as terminal/IRC

DELIVERABLES:
- Repo structure with /contracts and /apps (or unified) matching best practices
- Clear README: setup, deploy contracts, run frontend, env vars (RPC, relayer endpoint, contract addresses)
- Minimal but clean code; consistent naming; avoid duplication; use reusable components.
- Provide a short demo script (3-min) describing steps and what judges should observe.

Do NOT:
- Make any ciphertext publicly decryptable.
- Leak salary amounts in events or logs.
- Add one-off CSS scattered across pages; centralize tokens and component styles.

If you must choose defaults due to missing info, state assumptions clearly at the top of your output and proceed.
```

---

## 5) 附註：專案命名建議
推薦名稱：**VaporPay**（短、好記、跟 Vaporwave 設計語彙一致，適合上台講與做品牌視覺）
