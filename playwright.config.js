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
    // Rebuild so the tests always run against a fresh `dist/`. The build
    // and the preview are both invoked through `npm run`, so
    // node_modules/.bin is on the PATH no matter what shell Playwright
    // starts the command in (a bare `vite` after `&&` would only resolve
    // if that directory happened to be on PATH already).
    // `--base=/` pins the base path for BOTH the build and the preview:
    // on CI, GITHUB_REPOSITORY is set (it drives the GitHub Pages base in
    // vite.config.js) and would otherwise make the build emit subpath asset
    // URLs while the preview server (or vice versa) assumes a different
    // base - the two must agree, otherwise the served app falls apart.
    // `--host` binds the server to the IPv4 loopback explicitly:
    // "localhost" can resolve to ::1 on some hosts (GitHub runners
    // included), which would leave 127.0.0.1:4173 - the URL below and the
    // tests' baseURL - unanswered.
    command:
      'npm run build -- --base=/ && npm run preview -- --port 4173 --strictPort --host 127.0.0.1 --base=/',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
