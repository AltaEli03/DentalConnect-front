import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  define: { global: 'globalThis' },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'maskable-icon-512x512.png'],
      manifest: {
        name: 'DentalConnect',
        short_name: 'DentalConnect',
        description: 'Consulta consultorios, servicios y citas dentales.',
        lang: 'es-MX',
        start_url: '/clinics',
        scope: '/',
        display: 'standalone',
        theme_color: '#003B4A',
        background_color: '#F5F8FA',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        importScripts: ['/push-handler.js'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico}'],
        runtimeCaching: [
          {
            // API responses carry live pagination and availability data. Never
            // serve a stale cached response when the API is slow or unreachable.
            urlPattern: ({ url }) => /^\/api(?:\/|$)/.test(url.pathname),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
});
