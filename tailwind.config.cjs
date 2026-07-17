const postizColors = require('./tailwind.tokens.cjs');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Postiz's exact color token map (copied verbatim from its tailwind config).
      colors: postizColors,
      fontFamily: {
        // Postiz's UI font, self-hosted (see src/styles/fonts.scss).
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
