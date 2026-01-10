"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { mainnet, localhost } from "wagmi/chains";
import { injected, metaMask } from "wagmi/connectors";
import { useState, type ReactNode } from "react";

// Custom chain for FHEVM testnet
const fhevmTestnet = {
  id: 9000,
  name: "FHEVM Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "ETH",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_RPC_URL || "https://devnet.zama.ai"],
    },
  },
  testnet: true,
} as const;

// Wagmi configuration
const config = createConfig({
  chains: [localhost, fhevmTestnet, mainnet],
  connectors: [
    injected(),
    metaMask(),
  ],
  transports: {
    [localhost.id]: http(),
    [fhevmTestnet.id]: http(),
    [mainnet.id]: http(),
  },
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      })
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
