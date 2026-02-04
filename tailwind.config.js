/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand colour palette
        brand: {
          // Primary slate blues (main UI colours)
          slate: {
            900: '#1f2937',
            800: '#364451',
            700: '#4a5d6b',
          },
          // Neutral greys
          grey: {
            100: '#f7f8fa',
            200: '#d0d9e0',
            400: '#9babc2',
          },
          // Accent colours
          green: '#92d050',
          cyan: '#00b0f0',
          orange: '#cc5500',
          gold: '#f4c255',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Instrument Sans', 'DM Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 8px -2px rgba(31, 41, 55, 0.08), 0 4px 16px -4px rgba(31, 41, 55, 0.12)',
        'medium': '0 4px 12px -2px rgba(31, 41, 55, 0.1), 0 8px 24px -4px rgba(31, 41, 55, 0.15)',
        'strong': '0 8px 24px -4px rgba(31, 41, 55, 0.15), 0 16px 48px -8px rgba(31, 41, 55, 0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
