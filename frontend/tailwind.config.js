/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-bebas)', 'Impact', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
        mello: {
          dark: '#0c0c0e',
          card: '#161619',
          border: 'rgba(255, 255, 255, 0.12)',
          muted: '#8e8e93',
          red: '#ff3b30',
        }
      }
    },
  },
  plugins: [],
}
