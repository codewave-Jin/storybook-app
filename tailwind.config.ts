import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        stone: {
          50: "#EAF4FB",
          100: "#D7EBF6",
          200: "#C0DCEC",
          300: "#A3C9DF",
          400: "#7EAFCC",
          500: "#5E93B3",
          600: "#4A7896",
          700: "#3B5E77",
          800: "#2F4A5F",
          900: "#243848",
          950: "#172430",
        },
      },
    },
  },
  plugins: [],
};
export default config;
