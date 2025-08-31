import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design System basé sur le rapport d'analyse
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        // Palette sombre principale
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        // Accent lumineux (bleu électrique)
        accent: {
          50: '#f0fdff',
          100: '#ccfbfe',
          200: '#99f6fc',
          300: '#59ecf7',
          400: '#00BFFF', // Couleur principale accent
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#083344',
        },
        // Couleurs d'alerte
        success: '#2FC47A',
        warning: '#F59E0B',
        error: '#E02424',
        // Thème sombre cyber
        cyber: {
          bg: '#0A192F',
          surface: '#112240',
          border: '#233554',
          text: '#E6E6E6',
          textMuted: '#8892B0',
        }
      },
      fontFamily: {
        sans: ['var(--font-mono)', 'ui-monospace', 'monospace'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
        display: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }],
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        'minimal-pulse': 'pulse 2s ease-in-out infinite',
        'loader': 'loader 1.5s ease-in-out infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        loader: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
      },
      boxShadow: {
        'minimal': '0 1px 3px rgba(255, 255, 255, 0.1)',
        'card': '0 4px 6px rgba(255, 255, 255, 0.05)',
      },
      backgroundImage: {
        'minimal-gradient': 'linear-gradient(180deg, #000000 0%, #111111 100%)',
        'grid-minimal': 'url("data:image/svg+xml,%3Csvg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23262626" fill-opacity="0.3"%3E%3Ccircle cx="20" cy="20" r="0.5"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
  ],
} satisfies Config;

export default config;