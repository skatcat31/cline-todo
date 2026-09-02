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
  // The same specs on all three browsers: the app's PWA/Notification and
  // drag-and-drop code paths have engine‑specific quirks (the drag start
  // even needs data set for Firefox – see TaskItem.jsx), so running them
  // only on Chromium would hide regressions on the other engines.
  projects: [
    { name: 'chromium', use: {} },
    { name: 'firefox', use: {} },
    { name: 'webkit', use: {} },
  ],
  webServer: {
    // Serve the production build from `dist/` (see
    // scripts/serve-e2e.mjs): on CI it reuses the artifact the ci job
    // just built (root base path), so the tests run against exactly that
    // build; locally (or if the artifact is missing) it builds a fresh
    // `dist/` first, so stale code is never tested.
    command: 'node scripts/serve-e2e.mjs',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
