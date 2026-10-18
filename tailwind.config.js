/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: [
          "var(--font-serif)",
          "Instrument Serif",
          "Georgia",
          "Cambria",
          "Times New Roman",
          "serif",
        ],
        sans: [
          "var(--font-sans)",
          "Hanken Grotesk",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        mono: [
          "var(--font-sans)",
          "Hanken Grotesk",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
      colors: {
        page: "#FBF6EE",
        card: "#FFFDF8",
        surface: "#FFFDF8",
        borderline: "#E8DCC8",
        hairline: "#E8DCC8",
        ink: "#2B1B14",
        muted: "#6B5848",
        maroon: {
          DEFAULT: "#5B1A2B",
          hover: "#3A0F1C",
          dark: "#3A0F1C",
        },
        saffron: "#E07A1F",
        gold: "#C9A24B",
        espresso: "#24100E",
      },
      borderRadius: {
        editorial: "14px",
      },
      transitionTimingFunction: {
        editorial: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
