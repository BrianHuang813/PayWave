import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Vaporwave / Outrun color palette
        vapor: {
          bg: "#090014",
          "bg-secondary": "#0D001A",
          "bg-tertiary": "#120020",
          foreground: "#E0E0E0",
          magenta: "#FF00FF",
          "magenta-dark": "#CC00CC",
          cyan: "#00FFFF",
          "cyan-dark": "#00CCCC",
          orange: "#FF9900",
          "orange-dark": "#CC7A00",
          pink: "#FF69B4",
          purple: "#9400D3",
          border: "#2D1B4E",
          "border-light": "#4A2B7A",
          muted: "#666666",
          success: "#00FF88",
          error: "#FF4444",
          warning: "#FFAA00",
        },
      },
      fontFamily: {
        orbitron: ["var(--font-orbitron)", "sans-serif"],
        mono: ["var(--font-share-tech-mono)", "monospace"],
      },
      boxShadow: {
        neon: "0 0 5px theme(colors.vapor.cyan), 0 0 20px theme(colors.vapor.cyan)",
        "neon-magenta":
          "0 0 5px theme(colors.vapor.magenta), 0 0 20px theme(colors.vapor.magenta)",
        "neon-orange":
          "0 0 5px theme(colors.vapor.orange), 0 0 20px theme(colors.vapor.orange)",
        "neon-lg":
          "0 0 10px theme(colors.vapor.cyan), 0 0 40px theme(colors.vapor.cyan)",
        glow: "0 0 30px rgba(0, 255, 255, 0.3)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-vaporwave":
          "linear-gradient(180deg, #FF00FF 0%, #00FFFF 50%, #FF9900 100%)",
        "gradient-sunset":
          "linear-gradient(180deg, #FF6B6B 0%, #FF00FF 50%, #4A0080 100%)",
        grid: "linear-gradient(rgba(45, 27, 78, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(45, 27, 78, 0.5) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "50px 50px",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        glow: "glow 2s ease-in-out infinite alternate",
        float: "float 6s ease-in-out infinite",
        scanline: "scanline 8s linear infinite",
        glitch: "glitch 0.3s ease-in-out",
        "text-shimmer": "text-shimmer 3s ease-in-out infinite",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 5px #00FFFF, 0 0 10px #00FFFF" },
          "100%": { boxShadow: "0 0 20px #00FFFF, 0 0 40px #00FFFF" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-20px)" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        glitch: {
          "0%, 100%": { transform: "translate(0)" },
          "20%": { transform: "translate(-2px, 2px)" },
          "40%": { transform: "translate(-2px, -2px)" },
          "60%": { transform: "translate(2px, 2px)" },
          "80%": { transform: "translate(2px, -2px)" },
        },
        "text-shimmer": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
