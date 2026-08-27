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
    // Optional: increase timeout for async UI interactions
    timeout: 5000,
  },
});
