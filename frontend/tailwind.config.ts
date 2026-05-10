import type { Config } from "tailwindcss";

/** Helper: wrap a CSS variable in Tailwind's alpha-aware rgb() syntax. */
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}"],
  // We don't use Tailwind's `dark:` modifier — theme is driven by
  // [data-theme] on <html> and CSS variables. Selector left for future use.
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        veranda: {
          ink: "#0E0B16",
          fog: "#F7F5EE",
          rose: "#F0A5A0",
          sage: "#7B9E89",
          gold: "#C9A86A",
        },
        // All pixel-* tokens are now driven by CSS variables defined in
        // globals.css. Both `bg-pixel-bg` and `bg-pixel-bg/40` (alpha) work.
        pixel: {
          bg: v("pixel-bg"),
          bg2: v("pixel-bg2"),
          panel: v("pixel-panel"),
          border: v("pixel-border"),
          dim: v("pixel-dim"),
          text: v("pixel-text"),
          orange: v("pixel-orange"),
          gold: v("pixel-gold"),
          green: v("pixel-green"),
          pink: v("pixel-pink"),
          blue: v("pixel-blue"),
          purple: v("pixel-purple"),
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', "serif"],
        body: ['"Inter"', "sans-serif"],
        pixel: ['"VT323"', "monospace"],
        mono: ['"Share Tech Mono"', "monospace"],
      },
      boxShadow: {
        // Driven by --shadow-glow so it adapts to the current theme.
        "pixel-glow": "var(--shadow-glow)",
      },
      keyframes: {
        livePulse: {
          "0%,100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: ".3", transform: "scale(1.5)" },
        },
        floaty: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-3px)" },
        },
        scanlines: {
          from: { backgroundPosition: "0 0" },
          to: { backgroundPosition: "0 4px" },
        },
      },
      animation: {
        livePulse: "livePulse 1.2s ease-in-out infinite",
        floaty: "floaty 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
