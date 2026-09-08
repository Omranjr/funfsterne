/** @type {import('tailwindcss').Config} */
// NativeWind is wired up but currently unused: there are no `className`
// props in the source, which all styles via StyleSheet + useTheme(). The
// colours below are deliberately NOT a second copy of the brand palette --
// src/theme.ts is the single source of truth, and duplicating hexes here
// is how the two drifted apart before.
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "../../../packages/core/src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: { extend: {} },
  plugins: [],
};
