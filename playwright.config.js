// End-to-end tests run against a production build served by
// `vite preview`, so they exercise the same artifacts (including the
// service worker) that the PWA ships.
import { defineConfig } from '@playwright/test';

/** @type {import('@playwright/test').PlaywrightTestConfig} */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
  },
  webServer: {
    // Rebuild so the tests always run against a fresh `dist/`.
    command: 'npm run build && vite preview --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
