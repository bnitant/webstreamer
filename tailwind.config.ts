import type { Config } from 'tailwindcss'
import forms from '@tailwindcss/forms'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#e0f4ff',
          100: '#b8e5ff',
          200: '#7dcfff',
          300: '#38bdf8',
          400: '#0ea5e9',
          500: '#0284c7',
          600: '#0369a1',
          700: '#1e4f7a',
          800: '#1a3a5c',
          900: '#1e3a5f',
          950: '#0d1f38',
        },
        accent: {
          cyan:   '#06b6d4',
          indigo: '#6366f1',
          sky:    '#38bdf8',
          sapphire: '#1d4ed8',
        },
        dark: {
          900: '#0a0f1e',
          800: '#0d1526',
          700: '#111827',
          600: '#1a2235',
          500: '#1e2d42',
        },
      },
      fontFamily: {
        heading: ['var(--font-space-grotesk)', 'sans-serif'],
        body:    ['var(--font-inter)', 'sans-serif'],
        sans:    ['var(--font-inter)', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial':  'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':   'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'hero-gradient':    'linear-gradient(135deg, #0a0f1e 0%, #0d1526 50%, #0a0f1e 100%)',
        'card-gradient':    'linear-gradient(135deg, rgba(14,165,233,0.1) 0%, rgba(99,102,241,0.05) 100%)',
        'button-gradient':  'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
        'chat-self':        'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
      },
      boxShadow: {
        'glow-sm':  '0 0 10px rgba(14,165,233,0.3)',
        'glow':     '0 0 20px rgba(14,165,233,0.4)',
        'glow-lg':  '0 0 40px rgba(14,165,233,0.5)',
        'glow-xl':  '0 0 60px rgba(14,165,233,0.6)',
        'glow-indigo': '0 0 20px rgba(99,102,241,0.4)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'float':      'float 6s ease-in-out infinite',
        'float-slow': 'float 10s ease-in-out infinite',
        'slide-up':   'slide-up 0.5s ease-out forwards',
        'fade-in':    'fade-in 0.4s ease-out forwards',
        'spin-slow':  'spin 8s linear infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 10px rgba(14,165,233,0.3)' },
          '50%':       { boxShadow: '0 0 30px rgba(14,165,233,0.7)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':       { transform: 'translateY(-20px)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [forms],
}

export default config
