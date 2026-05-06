import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#08090c",
          muted: "#10121a",
          subtle: "#181b25",
        },
        surface: {
          DEFAULT: "#141722",
          hover: "#1c2030",
          raised: "#1f2333",
        },
        border: {
          DEFAULT: "#262a3a",
          strong: "#3a3f55",
          brand: "#6b4a1c",
        },
        fg: {
          DEFAULT: "#eef0f6",
          muted: "#a3a7b8",
          subtle: "#6b7088",
        },
        brand: {
          DEFAULT: "#f3a536",
          hover: "#ffba4d",
          dim: "#92611f",
          glow: "rgba(243, 165, 54, 0.35)",
        },
        accent: {
          DEFAULT: "#38bdf8",
          dim: "#1e6b91",
        },
        combat: {
          DEFAULT: "#ef4444",
          dim: "#7f1d1d",
        },
        success: {
          DEFAULT: "#22c55e",
          dim: "#14532d",
        },
        tier: {
          gold: "#fbbf24",
          silver: "#cbd5e1",
          bronze: "#b45309",
        },
        danger: "#ef4444",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(243, 165, 54, 0.35), 0 0 24px -4px rgba(243, 165, 54, 0.45)",
        "glow-sm": "0 0 0 1px rgba(243, 165, 54, 0.25), 0 0 12px -2px rgba(243, 165, 54, 0.3)",
        "ring-accent": "0 0 0 1px rgba(56, 189, 248, 0.35), 0 0 16px -4px rgba(56, 189, 248, 0.4)",
        "card-raised": "0 1px 0 0 rgba(255, 255, 255, 0.04) inset, 0 8px 24px -12px rgba(0, 0, 0, 0.7)",
      },
      backgroundImage: {
        "grid-faint":
          "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
        "radial-brand":
          "radial-gradient(ellipse at top right, rgba(243, 165, 54, 0.18), transparent 60%)",
        "radial-accent":
          "radial-gradient(ellipse at top left, rgba(56, 189, 248, 0.12), transparent 55%)",
        "scanlines":
          "repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 3px)",
      },
      backgroundSize: {
        "grid-md": "32px 32px",
        "grid-sm": "16px 16px",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(243, 165, 54, 0)" },
          "50%": { boxShadow: "0 0 0 4px rgba(243, 165, 54, 0.15)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s linear infinite",
        "pulse-glow": "pulse-glow 2.4s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.4s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
