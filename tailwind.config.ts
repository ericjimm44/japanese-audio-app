import type { Config } from "tailwindcss";

// Colours come from CSS custom properties (app/globals.css), generated from
// replica/design/tokens.json. Components use roles (bg-surface, text-muted),
// never raw hex, so a rebrand only touches the tokens.
const role = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: role("bg"),
        surface: role("surface"),
        elevated: role("elevated"),
        border: role("border"),
        "border-input": role("border-input"),
        text: role("text"),
        muted: role("text-muted"),
        accent: role("accent"),
        "on-accent": role("on-accent"),
        danger: role("danger"),
        success: role("success"),
      },
      borderRadius: { sm: "8px", md: "12px", lg: "20px" },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        ja: ["Noto Sans JP", "Hiragino Sans", "Yu Gothic", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
