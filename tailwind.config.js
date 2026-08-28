/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F2F3EF',
        surface: {
          DEFAULT: '#FFFFFF',
          alt: '#EAEDE6',
        },
        ink: {
          DEFAULT: '#17231F',
          soft: '#5A6960',
          faint: '#8B978E',
        },
        sidebar: {
          bg: '#122120',
          'bg-2': '#0C1716',
          line: '#26403C',
          text: '#B9CAC3',
          dim: '#6E8A81',
        },
        accent: {
          DEFAULT: '#B8722E',
          hover: '#9E5F23',
          soft: '#F0DCC2',
          ink: '#5B3714',
        },
        brand: {
          teal: '#3E6E64',
          'teal-soft': '#DCE9E4',
          danger: '#B94A3D',
          'danger-soft': '#F5DCD8',
          warning: '#B98A2E',
          'warning-soft': '#F3E6C7',
          success: '#3F7D53',
          'success-soft': '#DCEBDF',
          border: '#DFE2D9',
        },
        primary: {
          50: '#fbf6f0',
          100: '#f5e9dc',
          200: '#edd2b8',
          300: '#e1b48e',
          400: '#d19161',
          500: '#b8722e', // sample accent
          600: '#a35f24',
          700: '#85491e',
          800: '#6d3b1d',
          900: '#5a321b',
          950: '#33190b',
        },
        secondary: {
          50: '#f2f7f6',
          100: '#ddece9',
          200: '#bedbd5',
          300: '#94c2b9',
          400: '#6da69c',
          500: '#3e6e64', // sample teal
          600: '#345e56',
          700: '#2d4d47',
          800: '#27413d',
          900: '#233734',
          950: '#122120', // sample sidebar
        },
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'Inter', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { transform: 'translateY(8px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          from: { transform: 'translateY(-8px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'zoom-in-95': {
          from: { transform: 'scale(0.95)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-6px)' },
          '40%': { transform: 'translateX(6px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.2s ease-out',
        'slide-down': 'slide-down 0.2s ease-out',
        shimmer: 'shimmer 1.5s infinite linear',
        in: 'zoom-in-95 0.15s ease-out',
        shake: 'shake 0.4s ease-in-out',
      },
    },
  },
  plugins: [],
};
