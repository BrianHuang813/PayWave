/**
 * FHEVM SDK 整合模組
 * 提供加密輸入建立與用戶解密功能
 * 
 * 注意：此模組需要 @zama-fhe/relayer-sdk 套件
 * 在正式環境使用前，請確保已正確安裝
 */

import { type Address } from "viem";

// ============ Types ============

/**
 * 加密輸入結果
 */
export interface EncryptedInputs {
  handles: `0x${string}`[];
  inputProof: `0x${string}`;
}

/**
 * 解密請求參數
 */
export interface DecryptRequest {
  handles: bigint[];
  contractAddress: Address;
  userAddress: Address;
}

/**
 * Payslip 加密輸入資料
 */
export interface PayslipInputData {
  baseSalary: bigint;    // 6 decimals (USDC)
  bonus: bigint;
  penalty: bigint;
  unpaidLeave: bigint;
}

/**
 * 解密後的 Payslip 資料
 */
export interface DecryptedPayslip {
  base: bigint;
  bonus: bigint;
  penalty: bigint;
  unpaidLeave: bigint;
  net: bigint;
}

// ============ FHEVM Network Config ============

/**
 * FHEVM 網路配置
 */
export const FHEVM_CONFIG = {
  // Sepolia Testnet
  11155111: {
    aclAddress: "0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D",
    coprocessorAddress: "0x92C920834Ec8941d2C77D188936E1f7A6f49c127",
    relayerUrl: "https://relayer.sepolia.zama.ai",
  },
  // Local Hardhat (mock encryption)
  31337: {
    aclAddress: "0x50157CFfD6bBFA2DECe204a89ec419c23ef5755D",
    coprocessorAddress: "0xe3a9105a3a932253A70F126eb1E3b589C643dD24",
    relayerUrl: "http://localhost:8000",
  },
} as const;

// ============ Mock Implementation ============
// 在本地開發時使用 mock 實作，正式環境請使用真實 SDK

/**
 * 是否使用 mock 模式
 * 目前因為 SDK 尚未發布，所有環境都使用 mock 模式
 * 當 SDK 正式發布後，可以設定 NEXT_PUBLIC_FHEVM_REAL_MODE=true 啟用真實模式
 */
export function isMockMode(chainId: number): boolean {
  // SDK 尚未發布，強制使用 mock 模式
  // 未來發布後可以改為: return chainId === 31337 && !isRealModeEnabled();
  return true;
}

/**
 * 生成 mock handle (用於本地測試)
 */
function generateMockHandle(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`;
}

/**
 * Mock 加密輸入生成
 * 在本地開發時使用，回傳假的 handles 和 proof
 */
async function createMockEncryptedInput(
  data: PayslipInputData
): Promise<EncryptedInputs> {
  // 模擬網路延遲
  await new Promise((resolve) => setTimeout(resolve, 500));
  
  // 生成 4 個 mock handles (base, bonus, penalty, unpaidLeave)
  const handles: `0x${string}`[] = [
    generateMockHandle(),
    generateMockHandle(),
    generateMockHandle(),
    generateMockHandle(),
  ];
  
  // 生成 mock proof
  const inputProof = generateMockHandle();
  
  console.log("[FHEVM Mock] Created encrypted inputs:", {
    data: {
      baseSalary: data.baseSalary.toString(),
      bonus: data.bonus.toString(),
      penalty: data.penalty.toString(),
      unpaidLeave: data.unpaidLeave.toString(),
    },
    handles,
  });
  
  return { handles, inputProof };
}

/**
 * Mock 解密功能
 * 回傳假的解密資料用於測試
 */
async function mockUserDecrypt(
  handles: bigint[],
  _contractAddress: Address,
  _userAddress: Address
): Promise<bigint[]> {
  // 模擬解密延遲
  await new Promise((resolve) => setTimeout(resolve, 1500));
  
  // 回傳 mock 資料
  // 在實際情況中，這些值會來自鏈上加密資料的解密
  const mockValues = [
    BigInt(5000_000000), // base: $5000
    BigInt(500_000000),  // bonus: $500
    BigInt(100_000000),  // penalty: $100
    BigInt(200_000000),  // unpaidLeave: $200
    BigInt(5200_000000), // net: $5200 (計算: 5000+500-100-200)
  ];
  
  console.log("[FHEVM Mock] Decrypted values:", mockValues.map(v => v.toString()));
  
  // 回傳與 handles 數量相同的值
  return mockValues.slice(0, handles.length);
}

// ============ Real FHEVM Implementation ============
// 注意：@zama-fhe/relayer-sdk 尚未正式發布
// 目前所有環境都使用 mock 模式
// 當 SDK 正式發布後，設定 NEXT_PUBLIC_FHEVM_REAL_MODE=true 啟用

/**
 * 檢查是否啟用真實 FHEVM 模式
 */
function isRealModeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FHEVM_REAL_MODE === "true";
}

/**
 * 真實 FHEVM 加密輸入建立
 * 使用官方 relayer-sdk
 * 
 * @deprecated 目前 SDK 尚未發布，此函數暫時不可用
 */
async function createRealEncryptedInput(
  contractAddress: Address,
  userAddress: Address,
  data: PayslipInputData,
  chainId: number
): Promise<EncryptedInputs> {
  // SDK 尚未發布，拋出明確錯誤
  throw new Error(
    "[FHEVM] Real encryption is not yet available. " +
    "The @zama-fhe/relayer-sdk package is not released. " +
    "Please use mock mode for development."
  );
  
  // 以下代碼保留供未來使用
  /*
  const { createEncryptedInput } = await import("@zama-fhe/relayer-sdk");
  const input = await createEncryptedInput(contractAddress, userAddress);
  input.add64(data.baseSalary);
  input.add64(data.bonus);
  input.add64(data.penalty);
  input.add64(data.unpaidLeave);
  const { handles, inputProof } = await input.encrypt();
  return {
    handles: handles as `0x${string}`[],
    inputProof: inputProof as `0x${string}`,
  };
  */
}

/**
 * 真實 FHEVM 用戶解密
 * 需要 EIP-712 簽名
 * 
 * @deprecated 目前 SDK 尚未發布，此函數暫時不可用
 */
async function realUserDecrypt(
  handles: bigint[],
  contractAddress: Address,
  userAddress: Address,
  signTypedData: (params: any) => Promise<`0x${string}`>,
  chainId: number
): Promise<bigint[]> {
  // SDK 尚未發布，拋出明確錯誤
  throw new Error(
    "[FHEVM] Real decryption is not yet available. " +
    "The @zama-fhe/relayer-sdk package is not released. " +
    "Please use mock mode for development."
  );
  
  // 以下代碼保留供未來使用
  /*
  const { userDecrypt } = await import("@zama-fhe/relayer-sdk");
  const config = FHEVM_CONFIG[chainId as keyof typeof FHEVM_CONFIG];
  if (!config) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  const plaintexts = await userDecrypt({
    handles,
    contractAddress,
    userAddress,
    signTypedData,
    relayerUrl: config.relayerUrl,
  });
  return plaintexts;
  */
}

// ============ Public API ============

/**
 * 建立加密的 Payslip 輸入
 * 
 * @param contractAddress Payroll 合約地址
 * @param userAddress 發送者地址 (issuer)
 * @param data Payslip 資料
 * @param chainId 當前網路 chain ID
 * @returns 加密後的 handles 和 proof
 * 
 * @example
 * ```ts
 * const { handles, inputProof } = await createEncryptedPayslipInputs(
 *   payrollAddress,
 *   issuerAddress,
 *   {
 *     baseSalary: parseUSDC("5000"),
 *     bonus: parseUSDC("500"),
 *     penalty: parseUSDC("100"),
 *     unpaidLeave: parseUSDC("200"),
 *   },
 *   chainId
 * );
 * 
 * // 呼叫合約
 * await payroll.setPayslipInputs(
 *   employee,
 *   period,
 *   handles[0], // baseHandle
 *   handles[1], // bonusHandle
 *   handles[2], // penaltyHandle
 *   handles[3], // unpaidLeaveHandle
 *   inputProof,
 *   policyHash
 * );
 * ```
 */
export async function createEncryptedPayslipInputs(
  contractAddress: Address,
  userAddress: Address,
  data: PayslipInputData,
  chainId: number
): Promise<EncryptedInputs> {
  if (isMockMode(chainId)) {
    console.log("[FHEVM] Using mock mode for local development");
    return createMockEncryptedInput(data);
  }
  
  return createRealEncryptedInput(contractAddress, userAddress, data, chainId);
}

/**
 * 解密用戶的 Payslip 資料
 * 
 * @param handles 從合約取得的加密 handles
 * @param contractAddress Payroll 合約地址
 * @param userAddress 用戶地址 (employee)
 * @param signTypedData EIP-712 簽名函數 (來自 wagmi)
 * @param chainId 當前網路 chain ID
 * @returns 解密後的明文資料
 * 
 * @example
 * ```ts
 * // 取得加密 handles
 * const [base, bonus, penalty, unpaid, net] = await payroll.getPayslipCipher(employee, period);
 * 
 * // 解密
 * const plaintexts = await decryptPayslip(
 *   [base, bonus, penalty, unpaid, net],
 *   payrollAddress,
 *   employeeAddress,
 *   signTypedDataAsync,
 *   chainId
 * );
 * 
 * // plaintexts = [baseSalary, bonus, penalty, unpaidLeave, netPay]
 * ```
 */
export async function decryptPayslip(
  handles: bigint[],
  contractAddress: Address,
  userAddress: Address,
  signTypedData: ((params: any) => Promise<`0x${string}`>) | null,
  chainId: number
): Promise<DecryptedPayslip> {
  let plaintexts: bigint[];
  
  if (isMockMode(chainId)) {
    console.log("[FHEVM] Using mock mode for local development");
    plaintexts = await mockUserDecrypt(handles, contractAddress, userAddress);
  } else {
    if (!signTypedData) {
      throw new Error("signTypedData is required for real decryption");
    }
    plaintexts = await realUserDecrypt(
      handles,
      contractAddress,
      userAddress,
      signTypedData,
      chainId
    );
  }
  
  return {
    base: plaintexts[0] ?? BigInt(0),
    bonus: plaintexts[1] ?? BigInt(0),
    penalty: plaintexts[2] ?? BigInt(0),
    unpaidLeave: plaintexts[3] ?? BigInt(0),
    net: plaintexts[4] ?? BigInt(0),
  };
}

/**
 * 格式化 USDC 金額 (6 decimals) 為字串
 */
export function formatFhevmUSDC(amount: bigint): string {
  const num = Number(amount) / 1_000_000;
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
