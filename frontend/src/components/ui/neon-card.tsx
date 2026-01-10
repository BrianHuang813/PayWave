"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface NeonCardProps {
  children: React.ReactNode;
  className?: string;
  accentColor?: "cyan" | "magenta" | "orange";
  hoverable?: boolean;
  animate?: boolean;
}

export function NeonCard({
  children,
  className,
  accentColor = "cyan",
  hoverable = true,
  animate = false,
}: NeonCardProps) {
  const accentColors = {
    cyan: "before:bg-vapor-cyan hover:shadow-neon",
    magenta: "before:bg-vapor-magenta hover:shadow-neon-magenta",
    orange: "before:bg-vapor-orange hover:shadow-neon-orange",
  };

  return (
    <motion.div
      className={cn(
        "relative rounded-lg border border-vapor-border bg-vapor-bg-secondary p-6",
        "before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px]",
        accentColors[accentColor],
        "transition-shadow duration-300",
        className
      )}
      initial={animate ? { opacity: 0, y: 20 } : undefined}
      animate={animate ? { opacity: 1, y: 0 } : undefined}
      whileHover={hoverable ? { y: -4 } : undefined}
      transition={{ duration: 0.3 }}
    >
      {/* Dual border effect */}
      <div className="absolute inset-[3px] rounded-lg border border-vapor-border/30 pointer-events-none" />
      
      {children}
    </motion.div>
  );
}
