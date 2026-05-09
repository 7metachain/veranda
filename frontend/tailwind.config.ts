import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}"],
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
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', "serif"],
        body: ['"Inter"', "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
