import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'logo_fs.png'],
      manifest: {
        name: 'ChronoFS - Faculté des Sciences UEB',
        short_name: 'ChronoFS',
        description: "Gestion des emplois du temps - Faculté des Sciences, Université d'Ébolowa",
        theme_color: '#1E3A8A',
        background_color: '#FAFAFA',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'fr',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/logo_fs.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/logo_fs.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    // Écoute sur toutes les interfaces (utile pour le partage réseau/ngrok)
    host: true,
    // Autorise l'accès via les domaines ngrok (sinon Vite renvoie
    // « Blocked request. This host is not allowed »).
    allowedHosts: ['.ngrok-free.app', '.ngrok.app', '.ngrok.io'],
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
  // Mode « preview » : sert le build de production (bundle minifié).
  // Bien plus rapide que `dev` à travers ngrok, tout en gardant le proxy /api.
  preview: {
    host: true,
    allowedHosts: ['.ngrok-free.app', '.ngrok.app', '.ngrok.io'],
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
});
