/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // — Bleu institutionnel UEB —
        // — Palette officielle (maquette 2026-07-04). Ne pas inventer de bleus. —
        primary: {
          50:  '#F2F5FE',  // bleu-lavande très clair (fond hero, cases) — teinte maquette
          100: '#E6ECF7',  // bordures
          200: '#D9E3F5',  // bleu clair (bordure bouton secondaire)
          300: '#DCE7FF',  // bleu clair (icônes sur fond foncé)
          400: '#3E5EC0',  // bleu moyen (hover, icônes)
          500: '#2F4EB8',  // bleu moyen
          600: '#234BA0',  // bleu secondaire (accents de titre)
          700: '#1D419A',  // bleu secondaire
          800: '#183D95',  // bleu secondaire (hover foncé, fin de dégradé)
          900: '#143894',  // bleu principal maquette (aplats, boutons, bandes)
          950: '#102E7E',  // footer = bleu principal, légèrement plus profond
        },
        // — Accent doré unique #C8A15A (tampon « Sans conflit »). Les autres
        //   niveaux sont des variations claires/foncées de CE même doré. —
        gold: {
          50:  '#FAF6EC',
          100: '#F2E8CE',
          200: '#E7D3A6',
          300: '#D9BC7E',
          400: '#C8A15A',
          500: '#C8A15A',
          600: '#AC8846',
          700: '#8E6F38',
          800: '#6E5629',
        },
        // — Alias rétrocompatibilité : "accent-*" pointe sur le doré. —
        accent: {
          50:  '#FAF6EC',
          100: '#F2E8CE',
          200: '#E7D3A6',
          300: '#D9BC7E',
          400: '#C8A15A',
          500: '#C8A15A',
          600: '#AC8846',
          700: '#8E6F38',
          800: '#6E5629',
        },
        // — Surfaces (papier en clair, encre en sombre) —
        page: {
          DEFAULT: '#F4F6FC',  // fond gris très clair
          dark:    '#0A0F1F',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          alt:    '#F4F6FC',
          subtle: '#EEF3FC',
          dark:        '#111827',
          'dark-alt':  '#1A2235',
          'dark-subtle': '#0F1729',
        },
        ink: {
          strong:  '#1C2333',  // texte principal
          DEFAULT: '#1C2333',
          muted:   '#667085',  // texte secondaire
          subtle:  '#667085',
          'dark-strong': '#F5F4EE',
          'dark':        '#E5E5DE',
          'dark-muted':  '#A1A6B0',
          'dark-subtle': '#6F7787',
        },
        line: {
          DEFAULT: '#E6ECF7',  // bordures
          strong:  '#D9E3F5',
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
        card:      '0 1px 2px rgba(20,56,148,0.06), 0 1px 3px rgba(20,56,148,0.06)',
        'card-md': '0 4px 12px rgba(20,56,148,0.08)',
        'card-lg': '0 12px 24px -8px rgba(20,56,148,0.12), 0 4px 8px -4px rgba(20,56,148,0.06)',
        sidebar:   '1px 0 0 rgba(20,56,148,0.06)',
        'ring-gold': '0 0 0 1px rgba(200,161,90,0.30)',
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
