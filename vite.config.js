import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Progressive Web App: service worker + web app manifest, so the app is
    // installable and usable offline (a to‑do list should keep working
    // without a connection – the data lives in localStorage anyway).
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'To‑Do List',
        short_name: 'To‑Do',
        description:
          'A Material Design To‑Do list built with React, Vite and MUI',
        theme_color: '#1565c0',
        background_color: '#fafafa',
        display: 'standalone',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        // Precache the app shell so it loads offline.
        globPatterns: ['**/*.{js,css,svg}'],
      },
    }),
  ],
  // When deploying to GitHub Pages the site is served from a sub‑path
  // matching the repository name. Vite's `base` option handles this.
  // The environment variable GITHUB_REPOSITORY is of the form "owner/repo".
  base: process.env.GITHUB_REPOSITORY
    ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/`
    : '/',
  // Vitest configuration – use jsdom environment for DOM APIs
  test: {
    environment: 'jsdom',
    // Global test setup: localStorage polyfill + per-test isolation
    setupFiles: ['./src/test/setup.js'],
    // Optional: increase timeout for async UI interactions
    timeout: 5000,
  },
  // Vitest coverage configuration – enforce minimum 80% coverage for all metrics
  // This ensures CI pipelines will fail if coverage drops below the required threshold.
  coverage: {
    reporter: ['text', 'html'],
    // Enforce thresholds (percentage) – adjust as needed per project policy.
    thresholds: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
});
