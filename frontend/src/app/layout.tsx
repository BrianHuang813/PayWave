import type { Metadata } from "next";
import { Orbitron, Share_Tech_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ScanlinesOverlay } from "@/components/ui/scanlines-overlay";
import { Toaster } from "@/components/ui/toaster";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  display: "swap",
});

const shareTechMono = Share_Tech_Mono({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-share-tech-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PayWave - Confidential On-chain Payroll",
  description: "Privacy-preserving payroll powered by FHE on blockchain",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${orbitron.variable} ${shareTechMono.variable}`}
    >
      <body className="min-h-screen bg-vapor-bg antialiased">
        <Providers>
          <ScanlinesOverlay />
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
