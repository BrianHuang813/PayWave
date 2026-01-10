// Contract addresses configuration

export const CONTRACT_ADDRESSES = {
  // Local development (update after deployment)
  localhost: {
    usdc: process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    cusdc: process.env.NEXT_PUBLIC_CUSDC_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    wrapper: process.env.NEXT_PUBLIC_WRAPPER_ADDRESS || "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    treasury: process.env.NEXT_PUBLIC_TREASURY_ADDRESS || "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    payroll: process.env.NEXT_PUBLIC_PAYROLL_ADDRESS || "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
    gate: process.env.NEXT_PUBLIC_GATE_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
  },
  // FHEVM Testnet (update after deployment)
  fhevmTestnet: {
    usdc: "",
    cusdc: "",
    wrapper: "",
    treasury: "",
    payroll: "",
    gate: "",
  },
} as const;

export function getContractAddress(
  contract: keyof typeof CONTRACT_ADDRESSES.localhost,
  chainId: number = 31337
): `0x${string}` {
  const network = chainId === 31337 ? "localhost" : "fhevmTestnet";
  const address = CONTRACT_ADDRESSES[network]?.[contract];
  
  if (!address) {
    console.warn(`Contract address not found for ${contract} on chain ${chainId}`);
    return "0x0000000000000000000000000000000000000000";
  }
  
  return address as `0x${string}`;
}
