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
    // Serve the production build from `dist/`. On CI, `dist/` is the
    // artifact the ci job just built (root base path), so the build is
    // skipped and the tests run against exactly that build. Locally (or if
    // the artifact is missing), a fresh `dist/` is built first so stale
    // code is never tested.
    //
    // Invoked through `npm run`, so node_modules/.bin is on the PATH no
    // matter what shell Playwright starts the command in.
    //
    // `--base=/` pins the preview's base path: on CI, GITHUB_REPOSITORY is
    // set (it drives the GitHub Pages base in vite.config.js) and would
    // otherwise make the preview assume a different base than the built
    // asset URLs - the two must agree, otherwise the served app falls
    // apart.
    //
    // `--host` binds the server to the IPv4 loopback explicitly:
    // "localhost" can resolve to ::1 on some hosts (GitHub runners
    // included), which would leave 127.0.0.1:4173 - the URL below and the
    // tests' baseURL - unanswered.
    command:
      'if [ -d dist ] && [ -n "$CI" ]; then npm run preview -- --port 4173 --strictPort --host 127.0.0.1 --base=/; else npm run build -- --base=/ && npm run preview -- --port 4173 --strictPort --host 127.0.0.1 --base=/; fi',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
