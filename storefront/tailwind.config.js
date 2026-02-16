/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./context/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0a0a0a",
        mist: "#f6f4ef",
        ember: "#ff5a3c",
        fern: "#2a9d8f",
        cobalt: "#1d4ed8",
        night: "#0f172a",
      },
      boxShadow: {
        glow: "0 24px 60px -32px rgba(15, 23, 42, 0.7)",
        card: "0 18px 40px -32px rgba(15, 23, 42, 0.45)",
      },
    },
  },
  plugins: [],
};
