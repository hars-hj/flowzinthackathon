import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--color-background) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'surface-muted': 'rgb(var(--color-surface-muted) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        'text-primary': 'rgb(var(--color-text-primary) / <alpha-value>)',
        'text-secondary': 'rgb(var(--color-text-secondary) / <alpha-value>)',
        'text-hint': 'rgb(var(--color-text-hint) / <alpha-value>)',
        accent: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          light: 'rgb(var(--color-accent-light) / <alpha-value>)',
          dark: 'rgb(var(--color-accent-dark) / <alpha-value>)',
        },
        'sidebar-hover': 'rgb(var(--color-sidebar-hover) / <alpha-value>)',
        online: '#22C55E',
        // Added: used throughout the landing page (Navbar, Hero, WhyNexa, RAG, Deploy, CTA)
        // e.g. text-teal, bg-teal, bg-teal-dark, border-teal, hover:bg-teal-dark
        teal: {
          DEFAULT: '#2DD4BF',
          dark: '#14B8A6',
        },
      },
      fontFamily: {
        ui: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        message: ['"DM Sans"', 'system-ui', 'sans-serif'],
        // Added: landing page headlines use font-serif (h1/h2 in Hero, WhyNexa, RAG, Deploy, CTA)
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      fontSize: {
        xs: ['13px', { lineHeight: '1.5' }],
        sm: ['14px', { lineHeight: '1.5' }],
        base: ['15px', { lineHeight: '1.5' }],
        lg: ['18px', { lineHeight: '1.5' }],
      },
      // Added: non-standard spacing values used throughout the landing page
      // (mb-13, px-13, px-15, py-15, py-25, pt-25, p-7.5, px-7.5, px-6.5)
      // Default Tailwind scale has no 6.5, 7.5, 13, 15, 25 — without this
      // these classes silently produced no CSS at all.
      spacing: {
        '6.5': '1.625rem',
        '7.5': '1.875rem',
        '13': '3.25rem',
        '15': '3.75rem',
        '25': '6.25rem',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },transitionTimingFunction: {
        DEFAULT: 'ease',
      },
      keyframes: {
        'message-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'typing-dot': {
          '0%, 60%, 100%': { opacity: '0.3', transform: 'translateY(0)' },
          '30%': { opacity: '1', transform: 'translateY(-4px)' },
        },
      },
      animation: {
        'message-in': 'message-in 200ms ease forwards',
        'typing-dot': 'typing-dot 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config