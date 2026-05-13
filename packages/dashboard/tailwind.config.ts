/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#050508',
        surface: '#0c0c14',
        elevated: '#14141f',
        highlight: '#1c1c2e',
        'risk-critical': '#ff1a3c',
        'risk-high': '#ff6b00',
        'risk-medium': '#ffd600',
        'risk-low': '#00e676',
        'accent-blue': '#2979ff',
        'accent-cyan': '#00e5ff',
        'accent-purple': '#7c4dff',
        'text-primary': '#e8eaf6',
        'text-secondary': '#7986cb',
        'text-muted': '#3d405b',
        border: 'rgba(121,134,203,0.15)',
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
        body: ['"Inter"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
