import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
// The PWA options (manifest + service worker configuration). PNG icons
// are generated from the favicon design via `npm run icons`
// (scripts/generate-icons.mjs); 192/512 are the sizes installability
// criteria expect, and the maskable variant lets the OS crop the icon
// to its shape without losing the artwork.
export const pwaOptions = {
  registerType: 'autoUpdate',
  includeAssets: ['favicon.svg'],
  manifest: {
    name: 'To‑Do List',
    short_name: 'To‑Do',
    description: 'A Material Design To‑Do list built with React, Vite and MUI',
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
      {
        src: 'icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: 'icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: 'icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  },
  workbox: {
    // Precache the app shell so it loads offline – including the
    // self‑hosted font files (so the Material typography survives a
    // disconnect) and the PNG app icons (so an installed app keeps its
    // icons while offline).
    globPatterns: ['**/*.{js,css,html,webmanifest,svg,woff2,png}'],
  },
};

export default defineConfig({
  plugins: [
    react(),
    // Progressive Web App: service worker + web app manifest, so the app is
    // installable and usable offline (a to‑do list should keep working
    // without a connection – the data lives in localStorage anyway).
    // The options live in an exported constant so the manifest and the
    // precache pattern can be asserted in tests (see vite.config.test.js).
    VitePWA(pwaOptions),
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
    // The Playwright specs in e2e/ are run with `playwright test`, not Vitest
    exclude: ['dist', 'node_modules', 'e2e/**'],
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
