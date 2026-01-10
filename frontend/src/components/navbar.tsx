"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, formatAddress } from "@/lib/utils";
import { NeonButton } from "./ui/neon-button";
import { Wallet, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useConnect, useDisconnect } from "wagmi";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/issuer", label: "Issuer" },
  { href: "/employee", label: "Employee" },
  { href: "/government", label: "Government" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const handleConnect = () => {
    // Try injected first (MetaMask, etc.), fallback to first available
    const injected = connectors.find((c) => c.id === "injected");
    const metaMask = connectors.find((c) => c.id === "metaMask");
    const connector = injected || metaMask || connectors[0];
    
    if (connector) {
      connect({ connector });
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-vapor-border bg-vapor-bg/80 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="font-orbitron text-2xl font-bold text-gradient">
              PayWave
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "font-mono text-sm uppercase tracking-wider transition-colors",
                  pathname === item.href
                    ? "text-vapor-cyan text-neon-cyan"
                    : "text-vapor-muted hover:text-vapor-cyan"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Wallet Connection */}
          <div className="hidden md:flex items-center gap-4">
            {isConnected ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-vapor-cyan/30 bg-vapor-cyan/10">
                  <div className="w-2 h-2 rounded-full bg-vapor-success animate-pulse" />
                  <span className="font-mono text-sm text-vapor-cyan">
                    {formatAddress(address || "")}
                  </span>
                </div>
                <NeonButton
                  variant="ghost"
                  size="sm"
                  onClick={() => disconnect()}
                >
                  Disconnect
                </NeonButton>
              </div>
            ) : (
              <NeonButton onClick={handleConnect} size="sm" loading={isPending}>
                <Wallet className="w-4 h-4 mr-2" />
                {isPending ? "Connecting..." : "Connect Wallet"}
              </NeonButton>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-vapor-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-vapor-border bg-vapor-bg"
          >
            <div className="container mx-auto px-4 py-4 space-y-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "block font-mono text-sm uppercase tracking-wider transition-colors py-2",
                    pathname === item.href
                      ? "text-vapor-cyan"
                      : "text-vapor-muted"
                  )}
                >
                  {item.label}
                </Link>
              ))}
              <div className="pt-4 border-t border-vapor-border">
                {isConnected ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-vapor-success animate-pulse" />
                      <span className="font-mono text-sm text-vapor-cyan">
                        {formatAddress(address || "")}
                      </span>
                    </div>
                    <NeonButton
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        disconnect();
                        setMobileMenuOpen(false);
                      }}
                    >
                      Disconnect
                    </NeonButton>
                  </div>
                ) : (
                  <NeonButton
                    onClick={handleConnect}
                    size="sm"
                    className="w-full"
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Connect Wallet
                  </NeonButton>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
