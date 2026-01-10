"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface GridBackgroundProps {
  className?: string;
  children?: React.ReactNode;
  showSun?: boolean;
}

export function GridBackground({
  className,
  children,
  showSun = false,
}: GridBackgroundProps) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Perspective grid */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute bottom-0 left-0 right-0 h-[60%]"
          style={{
            backgroundImage: `
              linear-gradient(to bottom, transparent 0%, rgba(45, 27, 78, 0.1) 100%),
              linear-gradient(90deg, rgba(45, 27, 78, 0.4) 1px, transparent 1px),
              linear-gradient(rgba(45, 27, 78, 0.4) 1px, transparent 1px)
            `,
            backgroundSize: "100% 100%, 60px 60px, 60px 60px",
            transform: "perspective(500px) rotateX(60deg)",
            transformOrigin: "center bottom",
          }}
        />
      </div>

      {/* Floating sun */}
      {showSun && (
        <motion.div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ bottom: "30%" }}
          animate={{
            y: [0, -10, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {/* Sun glow */}
          <div className="absolute inset-0 blur-3xl">
            <div className="w-48 h-48 rounded-full bg-gradient-to-b from-vapor-orange via-vapor-magenta to-transparent opacity-50" />
          </div>
          
          {/* Sun body */}
          <div className="relative w-48 h-24 overflow-hidden">
            <div className="w-48 h-48 rounded-full bg-gradient-to-b from-vapor-orange via-vapor-magenta to-vapor-purple">
              {/* Sun lines */}
              <div className="absolute inset-0 flex flex-col justify-end pb-8 gap-2">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="w-full bg-vapor-bg"
                    style={{ height: `${2 + i}px` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
