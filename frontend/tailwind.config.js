// File: frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Kita gunakan palet 'indigo' dari Tailwind
        // untuk mencocokkan warna biru di PDF Anda [cite: 37, 76, 82]
        primary: {
          DEFAULT: '#4338CA', // Mirip dengan indigo-700
          light: '#6366F1', // indigo-500
          dark: '#312E81', // indigo-900
        }
      }
    },
  },
  plugins: [],
}