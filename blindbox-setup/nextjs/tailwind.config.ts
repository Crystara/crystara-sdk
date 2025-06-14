import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    './node_modules/crystara-sdk/dist/**/*.{js,jsx}' // Include the Crystara SDK components
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          primary: "#6E44FF",
          secondary: "#FF44E3",
          accent: "#44FFED",
          dark: "#1A1A2E",
          light: "#F7F7FF",
        },
      },
    },
  },
  plugins: [],
};
export default config;
