#!/usr/bin/env node
/**
 * Serves the production build for the Playwright specs (the webServer
 * command in playwright.config.js):
 *
 *  - On CI, `dist/` is the artifact the ci job just built (root base
 *    path), so it is reused as is – the tests run against exactly that
 *    build.
 *  - Locally (or if the artifact is missing), a fresh `dist/` is built
 *    first, so stale code is never tested.
 *
 * Both invocations go through `npm run`, so node_modules/.bin is on the
 * PATH no matter what shell the server is started in.
 *
 * The preview's base path is pinned to `/`: on CI, GITHUB_REPOSITORY is
 * set (it drives the GitHub Pages base in vite.config.js) and would
 * otherwise make the preview assume a different base than the built
 * asset URLs – the two must agree, otherwise the served app falls apart.
 *
 * The server binds to the IPv4 loopback explicitly: "localhost" can
 * resolve to ::1 on some hosts (GitHub runners included), which would
 * leave 127.0.0.1:4173 – the URL the Playwright config waits for –
 * unanswered.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

// Run an npm script (build / preview), streaming its output; exit with
// the script's failure code so Playwright sees the web server command
// fail instead of waiting on a dead process.
const runNpm = (args) => {
  const result = spawnSync('npm', ['run', ...args], {
    stdio: 'inherit',
    // On Windows, npm is a .cmd shim that needs a shell to start.
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

// Reuse the existing build only on CI (the ci job's artifact); anywhere
// else – or if the artifact is absent – build it first.
const haveCiBuild =
  process.env.CI !== undefined && existsSync(join(process.cwd(), 'dist'));
if (!haveCiBuild) {
  runNpm(['build', '--', '--base', '/']);
}

runNpm([
  'preview',
  '--',
  '--port',
  '4173',
  '--strictPort',
  '--host',
  '127.0.0.1',
  '--base',
  '/',
]);
