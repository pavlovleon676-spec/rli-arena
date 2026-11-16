/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      colors: {
        graphite: '#18181B',
        sand: '#F5F2EB',
        ink: '#1C1917',
        border: '#E6E1D6',
        emerald: { deep: '#134E4A', dark: '#064E3B' },
        mint: '#A7F3D0',
        amber: { warm: '#F59E0B', dark: '#D97706' },
        terra: '#EA580C'
      },
      borderRadius: { card: '20px' }
    }
  },
  plugins: []
};
