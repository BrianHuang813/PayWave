"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

/**
 * Global CRT scanlines overlay
 * Adds retro monitor effect across the entire viewport
 */
export function ScanlinesOverlay() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[9999]"
      aria-hidden="true"
    >
      {/* Scanlines */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          background: `repeating-linear-gradient(
            0deg,
            rgba(0, 0, 0, 0.15) 0px,
            rgba(0, 0, 0, 0.15) 1px,
            transparent 1px,
            transparent 2px
          )`,
        }}
      />

      {/* Subtle vignette */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          background: `radial-gradient(
            ellipse at center,
            transparent 0%,
            transparent 60%,
            rgba(0, 0, 0, 0.4) 100%
          )`,
        }}
      />

      {/* Moving scanline (subtle) - only render on client */}
      {mounted && (
        <motion.div
          className="absolute left-0 right-0 h-[2px] opacity-[0.03]"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)",
            top: 0,
          }}
          animate={{
            y: [0, window.innerHeight],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      )}
    </div>
  );
}
