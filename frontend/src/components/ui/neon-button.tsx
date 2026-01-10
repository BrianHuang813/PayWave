"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-orbitron text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vapor-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-vapor-bg disabled:pointer-events-none disabled:opacity-50 uppercase tracking-wider",
  {
    variants: {
      variant: {
        default:
          "bg-vapor-cyan text-vapor-bg hover:bg-vapor-cyan/90 hover:shadow-neon border border-vapor-cyan",
        magenta:
          "bg-vapor-magenta text-vapor-bg hover:bg-vapor-magenta/90 hover:shadow-neon-magenta border border-vapor-magenta",
        orange:
          "bg-vapor-orange text-vapor-bg hover:bg-vapor-orange/90 hover:shadow-neon-orange border border-vapor-orange",
        outline:
          "border-2 border-vapor-cyan bg-transparent text-vapor-cyan hover:bg-vapor-cyan/10 hover:shadow-neon",
        "outline-magenta":
          "border-2 border-vapor-magenta bg-transparent text-vapor-magenta hover:bg-vapor-magenta/10 hover:shadow-neon-magenta",
        ghost:
          "bg-transparent text-vapor-foreground hover:bg-vapor-border/30 hover:text-vapor-cyan",
        link: "text-vapor-cyan underline-offset-4 hover:underline",
        destructive:
          "bg-vapor-error text-vapor-bg hover:bg-vapor-error/90 border border-vapor-error",
      },
      size: {
        default: "h-10 px-6 py-2",
        sm: "h-8 px-4 text-xs",
        lg: "h-12 px-8 text-base",
        xl: "h-14 px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface NeonButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  glowOnHover?: boolean;
}

const NeonButton = React.forwardRef<HTMLButtonElement, NeonButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading,
      glowOnHover = true,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <motion.button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        whileHover={glowOnHover ? { scale: 1.02 } : undefined}
        whileTap={{ scale: 0.98 }}
        {...(props as any)}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Processing...
          </span>
        ) : (
          children
        )}
      </motion.button>
    );
  }
);
NeonButton.displayName = "NeonButton";

export { NeonButton, buttonVariants };
