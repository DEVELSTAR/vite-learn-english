/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        emerald: {
          850: '#064e3b',
          950: '#022c22',
        },
      },
    },
  },
  plugins: [],
}
