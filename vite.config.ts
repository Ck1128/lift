/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves this repo at https://<user>.github.io/lift/
// so every asset path must start with /lift/ in production.
export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/lift/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
