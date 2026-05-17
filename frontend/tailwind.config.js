/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#eef3fa',
          100: '#c5d6ed',
          200: '#9fbae0',
          300: '#789ed3',
          400: '#5b88ca',
          500: '#3e72c1',
          600: '#2f5fa8',
          700: '#1e3a5f',
          800: '#162c4a',
          900: '#0e1e33',
        },
        accent: {
          400: '#fb923c',
          500: '#f97316',
          600: '#ea6c0a',
        },
      },
    },
  },
  plugins: [],
}
