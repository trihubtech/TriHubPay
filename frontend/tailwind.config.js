/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#10b981', // Emerald Green
          600: '#059669', // Deep Green
          700: '#047857',
          900: '#064e3b'
        },
        royalblue: {
          50: '#eff6ff',
          100: '#dbeafe',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb', // Royal Blue
          700: '#1d4ed8', // Deep Royal Blue
          800: '#1e40af',
          900: '#1e3a8a'
        },
        slate: {
          850: '#152033',
          950: '#070b14'
        }
      }
    },
  },
  plugins: [],
}
