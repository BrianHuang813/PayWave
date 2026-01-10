"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface TerminalWindowProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  headerColor?: "cyan" | "magenta" | "orange";
  maximizable?: boolean;
}

export function TerminalWindow({
  title = "terminal",
  children,
  className,
  headerColor = "cyan",
  maximizable = false,
}: TerminalWindowProps) {
  const [isMaximized, setIsMaximized] = React.useState(false);

  const headerColors = {
    cyan: "border-vapor-cyan/50",
    magenta: "border-vapor-magenta/50",
    orange: "border-vapor-orange/50",
  };

  const dotColors = {
    cyan: {
      close: "bg-red-500",
      minimize: "bg-yellow-500",
      maximize: "bg-vapor-cyan",
    },
    magenta: {
      close: "bg-red-500",
      minimize: "bg-yellow-500",
      maximize: "bg-vapor-magenta",
    },
    orange: {
      close: "bg-red-500",
      minimize: "bg-yellow-500",
      maximize: "bg-vapor-orange",
    },
  };

  return (
    <motion.div
      className={cn(
        "rounded-lg border border-vapor-border bg-vapor-bg-secondary overflow-hidden",
        isMaximized && "fixed inset-4 z-50",
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Title bar */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-2 border-b bg-vapor-bg-tertiary",
          headerColors[headerColor]
        )}
      >
        {/* Window controls */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-3 h-3 rounded-full cursor-pointer hover:opacity-80 transition-opacity",
              dotColors[headerColor].close
            )}
          />
          <div
            className={cn(
              "w-3 h-3 rounded-full cursor-pointer hover:opacity-80 transition-opacity",
              dotColors[headerColor].minimize
            )}
          />
          {maximizable && (
            <div
              className={cn(
                "w-3 h-3 rounded-full cursor-pointer hover:opacity-80 transition-opacity",
                dotColors[headerColor].maximize
              )}
              onClick={() => setIsMaximized(!isMaximized)}
            />
          )}
        </div>

        {/* Title */}
        <span className="font-mono text-xs text-vapor-muted uppercase tracking-wider">
          {title}
        </span>

        {/* Spacer for alignment */}
        <div className="w-[52px]" />
      </div>

      {/* Content */}
      <div className="p-4">{children}</div>
    </motion.div>
  );
}
