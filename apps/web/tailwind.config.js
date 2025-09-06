/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        midnight: '#0B132B', // Bleu Nuit Profond
        electric: '#1F7AE0', // Bleu Électrique
        graphite: '#1C1F24',
        soft: {
          gray: '#D6DBE1',
          blue: '#E6F0FF',
        },
      },
      fontFamily: {
        inter: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        poppins: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 6px 24px rgba(0,0,0,0.12)',
      },
      borderRadius: {
        xl: '16px',
      },
    },
  },
  plugins: [],
};
