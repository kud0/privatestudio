/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        beige: {
          100: '#Fdfbf7',
          200: '#F5Efe6',
          300: '#Ebe2d0',
          400: '#E0d4ba', // Main wall color
          500: '#D1c0a0',
          900: '#5c5240',
        }
      }
    },
  },
  plugins: [],
} 