/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        civic: {
          50: '#f0f4ff',
          100: '#dbe4ff',
          500: '#3b5bdb',
          600: '#2f4ac7',
          700: '#2341b5',
          900: '#1a2d7a',
        },
      },
    },
  },
  plugins: [],
};
