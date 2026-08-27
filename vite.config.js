import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // When deploying to GitHub Pages the site is served from a sub‑path
  // matching the repository name. Vite's `base` option handles this.
  // The environment variable GITHUB_REPOSITORY is of the form "owner/repo".
  base: process.env.GITHUB_REPOSITORY ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/` : '/',
  // Vitest configuration – use jsdom environment for DOM APIs
  test: {
    environment: 'jsdom',
    globals: true,
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
