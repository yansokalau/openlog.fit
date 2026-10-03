import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Scope covers the landing page too, so it can offer the install prompt;
      // an installed copy always opens straight into the app.
      manifest: {
        id: '/app/',
        name: 'OpenLog — workout & training log',
        short_name: 'OpenLog',
        description:
          'A minimal log for lifts, runs, climbs and body measurements. Free, offline, no account.',
        start_url: '/app/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#000000',
        theme_color: '#000000',
        categories: ['health', 'fitness', 'lifestyle'],
        icons: [
          { src: '/pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        globIgnores: ['og.png', 'icon.png'],
        // The app is a single-page shell; the landing page and 404 are their
        // own documents and must not fall back into it.
        navigateFallback: '/app/index.html',
        navigateFallbackAllowlist: [/^\/app(\/|$)/],
      },
    }),
  ],
  build: {
    rollupOptions: {
      input: { landing: 'index.html', app: 'app/index.html' },
    },
  },
  server: {
    // Listen on the LAN too, so a phone on the same Wi-Fi can open the dev server.
    host: true,
    // /api is a Pages Function; `npm run dev:api` serves it on 8788.
    proxy: { '/api': 'http://localhost:8788' },
  },
})
