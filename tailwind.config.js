/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#FAFAFA',
        surface: {
          DEFAULT: '#FFFFFF',
          alt: '#F4F4F5',
        },
        ink: {
          DEFAULT: '#09090B',
          soft: '#71717A',
          faint: '#A1A1AA',
        },
        sidebar: {
          bg: '#09090B',
          'bg-2': '#18181B',
          line: '#27272A',
          text: '#E4E4E7',
          dim: '#A1A1AA',
        },
        accent: {
          DEFAULT: '#18181B',
          hover: '#27272A',
          soft: '#F4F4F5',
          ink: '#09090B',
        },
        brand: {
          teal: '#0284C7',
          'teal-soft': '#E0F2FE',
          danger: '#E11D48',
          'danger-soft': '#FFE4E6',
          warning: '#D97706',
          'warning-soft': '#FEF3C7',
          success: '#16A34A',
          'success-soft': '#DCFCE7',
          border: '#E4E4E7',
        },
        primary: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#09090b',
        },
        secondary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0284c7',
          600: '#0369a1',
          700: '#075985',
          800: '#0c4a6e',
          900: '#082f49',
          950: '#031f3f',
        },
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['"Be Vietnam Pro"', 'Inter', 'sans-serif'], // Minimalist: crisp sans font for headings as well
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      spacing: {
        tap: '44px',
      },
      fontSize: {
        display: ['2.5rem', { lineHeight: '1.1', fontWeight: '800', letterSpacing: '-0.02em' }],
        h1: ['1.75rem', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.01em' }],
        h2: ['1.25rem', { lineHeight: '1.3', fontWeight: '600' }],
        body: ['0.875rem', { lineHeight: '1.5' }],
        caption: ['0.75rem', { lineHeight: '1.4' }],
      },
      boxShadow: {
        'elevation-surface': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'elevation-raised': '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
        'elevation-overlay': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { transform: 'translateY(6px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          from: { transform: 'translateY(-6px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'slide-up': 'slide-up 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slide-down 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        shimmer: 'shimmer 2s infinite linear',
      },
    },
  },
  plugins: [],
};
