/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          dark: "#0F172A",
          blue: "#2563EB",
          blueHover: "#1D4ED8",
          cyan: "#06B6D4",
          bgLight: "#F8FAFC",
          bgDark: "#0B0F19",
          surfaceDark: "#1E293B",
        },
      },
      boxShadow: {
        soft: "0 2px 10px -3px rgba(15,23,42,.08)",
        premium: "0 10px 25px -5px rgba(15,23,42,.10)",
      },
    },
  },
  plugins: [],
};