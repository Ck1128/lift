/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves this repo at https://<user>.github.io/lift/
// so every asset path must start with /lift/ in production.
const base = process.env.VITE_BASE_PATH ?? '/lift/'

export default defineConfig({
  base,
  // Under test the PWA plugin is off, so give its virtual module an inert stand-in.
  resolve: process.env.VITEST ? { alias: { 'virtual:pwa-register': new URL('./src/test/pwa-stub.ts', import.meta.url).pathname } } : {},
  plugins: [
    react(),
    // The service worker is not needed (or wanted) while running tests.
    ...(process.env.VITEST
      ? []
      : [
          VitePWA({
            // "prompt": a new version waits until the user taps Reload, so it never interrupts a workout.
            registerType: 'prompt',
            includeAssets: ['icon-192.png', 'icon-512.png'],
            manifest: {
              name: 'Lift - Workout Planner',
              short_name: 'Lift',
              description: 'A free, private workout planner that works offline.',
              start_url: base,
              scope: base,
              display: 'standalone',
              orientation: 'portrait',
              background_color: '#f5f5f7',
              theme_color: '#ff5a1f',
              icons: [
                { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
                { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
              ],
            },
            workbox: {
              globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
              navigateFallback: `${base}index.html`,
              cleanupOutdatedCaches: true,
              runtimeCaching: [
                {
                  // Exercise photos are optional extras. Cache them the first time they are seen.
                  urlPattern: /^https:\/\/raw\.githubusercontent\.com\/yuhonas\/free-exercise-db\/.*\.jpg$/,
                  handler: 'CacheFirst',
                  options: {
                    cacheName: 'exercise-photos',
                    expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 90 },
                    cacheableResponse: { statuses: [0, 200] },
                  },
                },
              ],
            },
          }),
        ]),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
