/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef6f0",
          100: "#d6ebdb",
          200: "#aed7b8",
          300: "#7dbd8d",
          400: "#4f9e63",
          500: "#2f7d45",
          600: "#226336",
          700: "#1c4f2d",
          800: "#193f26",
          900: "#153420",
        },
      },
    },
  },
  plugins: [],
};
