/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",        // cherche dans le fichier HTML principal
    "./src/**/*.{js,jsx}", // cherche dans tous les fichiers JS/JSX du dossier src
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}