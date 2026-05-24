/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        gold:      '#C9A84C',
        'gold-lt': '#E2C472',
        'gold-dk': '#A8892E',
        ebg:       '#0A0A0A',
        ecard:     '#1A1A1A',
        esb:       '#111111',
        eborder:   '#2A2A2A',
        etext:     '#F4F4F4',
        emuted:    '#6B7280',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        body:    ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}