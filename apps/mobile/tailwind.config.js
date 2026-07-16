/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0A0A0A",
        primary: "#C9A84C",
        secondary: "#D4B660",
        surface: "#141414",
        muted: "#2A2A2A",
        text: "#FFFFFF",
        "text-muted": "#A3A3A3",
      },
    },
  },
  plugins: [],
};
