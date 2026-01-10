"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TerminalInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  prefix?: string;
}

const TerminalInput = React.forwardRef<HTMLInputElement, TerminalInputProps>(
  ({ className, label, error, prefix = ">", type, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-xs uppercase tracking-wider text-vapor-muted font-orbitron">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <span className="absolute left-3 text-vapor-cyan font-mono">
            {prefix}
          </span>
          <input
            type={type}
            className={cn(
              "flex h-10 w-full rounded-none border-b-2 border-vapor-border bg-transparent pl-8 pr-3 py-2",
              "font-mono text-vapor-cyan placeholder:text-vapor-magenta/50",
              "focus:outline-none focus:border-vapor-cyan focus:shadow-[0_2px_0_0_theme(colors.vapor.cyan)]",
              "transition-all duration-200",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-vapor-error focus:border-vapor-error",
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs text-vapor-error font-mono">{error}</p>
        )}
      </div>
    );
  }
);
TerminalInput.displayName = "TerminalInput";

export { TerminalInput };
