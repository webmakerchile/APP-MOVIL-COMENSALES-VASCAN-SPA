/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vascan: {
          gold: "#D4A843",
          goldDark: "#B8902E",
          goldLight: "#E8C96A",
          bg: "#1A1A2E",
          bgLight: "#16213E",
          surface: "#0F3460",
          surfaceLight: "#1A4A7A",
          error: "#E74C3C",
          success: "#2ECC71",
          warning: "#F39C12",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
