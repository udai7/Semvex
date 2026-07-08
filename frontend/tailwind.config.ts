import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "Hanken Grotesk", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      colors: {
        /* Infisical marketing (light) + OSS semantic tokens */
        v2: {
          bg: "var(--v2-color-bg)",
          "bg-page": "var(--v2-color-bg-page)",
          text: "var(--v2-color-text)",
          "text-muted": "var(--v2-color-text-muted)",
          "text-subtle": "var(--v2-color-text-subtle)",
          border: "var(--v2-color-border)",
          frame: "var(--v2-color-frame)",
          tint: "var(--v2-color-tint)",
          "tint-strong": "var(--v2-color-tint-strong)",
          void: "var(--v2-color-void)",
          volt: "var(--v2-color-volt)",
          lime: "var(--v2-color-accent-lime)",
          "accent-green": "var(--v2-color-accent-green)",
        },
        project: {
          DEFAULT: "#e0ed34",
          foreground: "#000000",
        },
        /* shadcn-compat aliases for any remaining refs */
        border: "var(--v2-color-border)",
        background: "var(--v2-color-bg)",
        foreground: "var(--v2-color-text)",
        primary: {
          DEFAULT: "var(--v2-color-text)",
          foreground: "var(--v2-color-bg)",
        },
        secondary: {
          DEFAULT: "var(--v2-color-tint-strong)",
          foreground: "var(--v2-color-text)",
        },
        muted: {
          DEFAULT: "var(--v2-color-tint-strong)",
          foreground: "var(--v2-color-text-muted)",
        },
        accent: {
          DEFAULT: "var(--v2-color-accent-lime)",
          foreground: "var(--v2-color-text)",
        },
        card: {
          DEFAULT: "var(--v2-color-bg)",
          foreground: "var(--v2-color-text)",
        },
      },
      maxWidth: {
        v2: "var(--v2-max-width)",
      },
      fontSize: {
        "display-lg": [
          "clamp(2.25rem, 5.5vw, 3.5rem)",
          { lineHeight: "1.08", letterSpacing: "-0.03em", fontWeight: "500" },
        ],
        display: [
          "clamp(1.75rem, 4vw, 2.25rem)",
          { lineHeight: "1.1", letterSpacing: "-0.025em", fontWeight: "500" },
        ],
        title: ["1.125rem", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
