import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a period number (YYYYMM) to readable string
 */
export function formatPeriod(period: number): string {
  const year = Math.floor(period / 100);
  const month = period % 100;
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  return `${monthNames[month - 1]} ${year}`;
}

/**
 * Format address to shortened form
 */
export function formatAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format USDC amount (6 decimals) to human readable
 */
export function formatUSDC(amount: bigint | number): string {
  const num = typeof amount === "bigint" ? Number(amount) : amount;
  return (num / 1_000_000).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Parse human readable USDC to base units (6 decimals)
 */
export function parseUSDC(amount: string): bigint {
  const num = parseFloat(amount);
  return BigInt(Math.floor(num * 1_000_000));
}

/**
 * Format timestamp to readable date/time
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

/**
 * Format seconds to countdown string
 */
export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "00:00:00";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Get payslip status label
 */
export function getStatusLabel(status: number): string {
  const labels = ["DRAFT", "COMPUTED", "PAID", "VOID"];
  return labels[status] || "UNKNOWN";
}

/**
 * Get status color class
 */
export function getStatusColor(status: number): string {
  switch (status) {
    case 0: return "text-vapor-orange";
    case 1: return "text-vapor-cyan";
    case 2: return "text-vapor-success";
    case 3: return "text-vapor-error";
    default: return "text-vapor-muted";
  }
}
