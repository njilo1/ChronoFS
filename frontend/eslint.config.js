import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    plugins: { react },
    settings: { react: { version: 'detect' } },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // Crédite l'objet racine d'un nom d'élément JSX en expression membre :
      // le cœur d'ESLint ne le fait que pour `<Foo/>`, pas pour `<Foo.Bar/>`,
      // d'où le faux positif `no-unused-vars` sur `motion` dans `<motion.div>`.
      'react/jsx-uses-vars': 'error',
      // Tolère les variables et arguments en PascalCase / underscore_prefixe :
      // - PascalCase  : composants React renommés via destructuration (icon: Icon)
      // - _prefixe    : conventions pour "explicitement ignoré" (_unused, _gradient)
      'no-unused-vars': ['error', {
        varsIgnorePattern: '^(_|[A-Z])',
        argsIgnorePattern: '^(_|[A-Z])',
        destructuredArrayIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
  },
  {
    // Fichiers de configuration côté Node — autorise __dirname, process, etc.
    files: ['vite.config.js', 'eslint.config.js', 'postcss.config.js', 'tailwind.config.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
])
