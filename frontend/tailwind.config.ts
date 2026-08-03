import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "audhd-dark-bg": "#121218",
        "pastel-sage": "#8BA888",
        "muted-lavender": {
          DEFAULT: "#C4B5FD",
          subtle: "#B8A9C9",
        },
        "warm-slate": {
          DEFAULT: "#2D3748",
          subtle: "#334155",
        },
      },
      minHeight: {
        "48": "48px",
        "touch": "48px",
      },
      minWidth: {
        "48": "48px",
        "touch": "48px",
      },
    },
  },
  plugins: [],
};

export default config;
