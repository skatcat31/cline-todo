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
    // Stable identity for the app across deployment URLs: the GitHub
    // Pages address is canonical, so installs from other origins (for
    // example the Docker deployment) read as the same application.
    id: 'https://skatcat31.github.io/cline-todo/',
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

// ---------------------------------------------------------------------------
// Security headers
// ---------------------------------------------------------------------------
// The app is static and self‑contained: every resource (including the
// self‑hosted fonts) comes from its own origin, and this policy encodes
// exactly that – and nothing else. `style-src 'unsafe-inline'` is required
// because Emotion injects <style> elements at runtime.
const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'";

// GitHub Pages cannot set HTTP response headers, so the production build
// carries the policy as a <meta> tag inside index.html. The Docker/nginx
// deployment sets the same policy as a real HTTP header (plus
// X‑Frame‑Options, which a meta tag cannot express) – see nginx.conf.
export const securityMetaTag = `<meta http-equiv="Content-Security-Policy" content="${CSP}" />`;

// Injects the CSP meta tag into the built index.html. `apply: 'build'`
// keeps it out of the dev server, where the policy would block Vite's HMR
// websocket.
export const injectSecurityMeta = {
  name: 'inject-security-meta',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace('</head>', `${securityMetaTag}\n</head>`),
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
    // Content‑Security‑Policy meta tag (build only – see above).
    injectSecurityMeta,
  ],
  // When deploying to GitHub Pages the site is served from a sub‑path
  // matching the repository name. Vite's `base` option handles this.
  // The environment variable GITHUB_REPOSITORY is of the form "owner/repo".
  base: process.env.GITHUB_REPOSITORY
    ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/`
    : '/',
  // The main bundle is ~500 kB minified and dominated by MUI, so Vite's
  // default 500 kB chunk warning fires on every build without saying
  // anything new. The real guardrail is the explicit bundle‑size budget
  // (scripts/check-bundle-size.mjs, run by the `ci` job); the limit is
  // set to the same value so Vite's warning and that budget agree.
  build: {
    chunkSizeWarningLimit: 600,
  },
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
