/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // — Bleu institutionnel UEB —
        primary: {
          50:  '#EFF4FB',
          100: '#D8E3F2',
          200: '#B3C6E2',
          300: '#85A2CC',
          400: '#5277AE',
          500: '#2E5391',
          600: '#1F4079',
          700: '#1A3568',
          800: '#162C56',
          900: '#1E3A8A',
          950: '#0F1F47',
        },
        // — Or académique discret (accent ponctuel) —
        gold: {
          50:  '#FBF7EC',
          100: '#F4EBCB',
          200: '#E9D596',
          300: '#DBBC5E',
          400: '#C9A227',
          500: '#A67E2E',
          600: '#8B6622',
          700: '#6F5018',
          800: '#544013',
        },
        // — Alias rétrocompatibilité : les anciennes classes "accent-*"
        //   pointent désormais sur la palette dorée institutionnelle.
        accent: {
          50:  '#FBF7EC',
          100: '#F4EBCB',
          200: '#E9D596',
          300: '#DBBC5E',
          400: '#C9A227',
          500: '#A67E2E',
          600: '#8B6622',
          700: '#6F5018',
          800: '#544013',
        },
        // — Surfaces (papier en clair, encre en sombre) —
        page: {
          DEFAULT: '#FAFAF7',
          dark:    '#0A0F1F',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          alt:    '#F3F4F1',
          subtle: '#F7F7F2',
          dark:        '#111827',
          'dark-alt':  '#1A2235',
          'dark-subtle': '#0F1729',
        },
        ink: {
          strong:  '#0B1220',
          DEFAULT: '#1F2937',
          muted:   '#5B6573',
          subtle:  '#8E97A4',
          'dark-strong': '#F5F4EE',
          'dark':        '#E5E5DE',
          'dark-muted':  '#A1A6B0',
          'dark-subtle': '#6F7787',
        },
        line: {
          DEFAULT: '#E5E2D8',
          strong:  '#C9C5B6',
          dark:    '#1F2A40',
          'dark-strong': '#2A3651',
        },
        success: '#0F6B45',
        danger:  '#B91C1C',
        warning: '#B45309',
        info:    '#0369A1',
      },
      fontFamily: {
        sans:    ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Cormorant Garamond"', '"Times New Roman"', 'serif'],
        mono:    ['"JetBrains Mono"', '"SF Mono"', 'Menlo', 'monospace'],
      },
      fontSize: {
        // Display sizes spécifiques aux titres serif
        'display-sm': ['1.875rem',  { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        'display':    ['2.5rem',    { lineHeight: '1.1',  letterSpacing: '-0.025em' }],
        'display-lg': ['3.25rem',   { lineHeight: '1.05', letterSpacing: '-0.03em' }],
      },
      boxShadow: {
        // Ombres sobres, pas de glow coloré
        card:      '0 1px 2px rgba(15,31,71,0.04), 0 1px 3px rgba(15,31,71,0.04)',
        'card-md': '0 4px 12px rgba(15,31,71,0.08)',
        'card-lg': '0 12px 24px -8px rgba(15,31,71,0.12), 0 4px 8px -4px rgba(15,31,71,0.06)',
        sidebar:   '1px 0 0 rgba(0,0,0,0.04)',
        'ring-gold': '0 0 0 1px rgba(166,126,46,0.30)',
      },
      animation: {
        shimmer:     'shimmer 1.8s linear infinite',
        'dot-pulse': 'dot-pulse 1.8s ease-in-out infinite',
        'fade-in':   'fade-in 0.4s ease-out',
        'fade-in-up': 'fade-in-up 0.45s ease-out',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition:  '1000px 0' },
        },
        'dot-pulse': {
          '0%,100%': { opacity: '1',   transform: 'scale(1)'   },
          '50%':     { opacity: '0.4', transform: 'scale(1.3)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)'   },
        },
      },
    },
  },
  plugins: [],
};
