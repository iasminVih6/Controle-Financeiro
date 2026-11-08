/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'] },
      colors: {
        ink: '#14211F',
        paper: '#F3F5F2',
        pine: { DEFAULT: '#0E6B5C', dark: '#0A4F44', soft: '#E1F0EC' },
        gold: { DEFAULT: '#A8690D', soft: '#FBF0DA' },
        brick: { DEFAULT: '#B42318', soft: '#FDE8E6' },
      },
    },
  },
  plugins: [],
}
