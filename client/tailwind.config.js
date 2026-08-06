/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff0f0',
          100: '#ffe0e0',
          200: '#ffc2c2',
          300: '#ffa3a3',
          400: '#ff7575',
          500: '#ff4d4d', // OpenClaw Coral
          600: '#e63946',
          700: '#cc2936',
          800: '#991b1b',
          900: '#661010',
          950: '#330606',
        },
        secondary: {
          50: '#e0fcf9',
          100: '#bdfaf4',
          200: '#8af5ea',
          300: '#52eedf',
          400: '#26e8d2',
          500: '#00e5cc', // Neon Cyan
          600: '#00ccb6',
          700: '#009988',
          800: '#00665b',
          900: '#00332d',
          950: '#001a17',
        },
        dark: {
          50: '#f0f4ff',
          100: '#dce4f5',
          200: '#b8c6e6',
          300: '#8892b0', // Muted Text
          400: '#5a6480',
          500: '#3a4460',
          600: '#2a344d',
          700: '#1b233a',
          800: '#111827', // Elevated Surface
          900: '#0a0f1a', // Glass Surface
          950: '#050810', // Deep Background
        },
      },
      fontFamily: {
        sans: ['Satoshi', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Clash Display', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp: { '0%': { transform: 'translateY(10px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
        slideDown: { '0%': { transform: 'translateY(-10px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
        scaleIn: { '0%': { transform: 'scale(0.95)', opacity: 0 }, '100%': { transform: 'scale(1)', opacity: 1 } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
      },
      boxShadow: {
        glow: "0 0 20px rgba(255, 77, 77, 0.3)", // Coral glow
        "glow-lg": "0 0 40px rgba(255, 77, 77, 0.4)",
        "glow-cyan": "0 0 20px rgba(0, 229, 204, 0.3)",
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
      },
    },
  },
  plugins: [],
};
