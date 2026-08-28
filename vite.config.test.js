// The Vite config also carries the PWA manifest and the service worker's
// precache pattern. Both matter for offline support, so they are asserted
// here – importing the config only instantiates plugins, it does not
// trigger a build.
import { expect, test } from 'vitest';
import { pwaOptions } from './vite.config.js';

test('the manifest offers installable PNG icons (192/512 + maskable)', () => {
  const { icons } = pwaOptions.manifest;
  expect(icons).toContainEqual(
    expect.objectContaining({
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    }),
  );
  expect(icons).toContainEqual(
    expect.objectContaining({
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    }),
  );
  expect(icons).toContainEqual(
    expect.objectContaining({
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    }),
  );
});

test('the service worker precaches the self‑hosted fonts for offline use', () => {
  const patterns = pwaOptions.workbox.globPatterns.join(',');
  expect(patterns).toMatch(/woff2/);
  expect(patterns).toMatch(/js/);
  expect(patterns).toMatch(/css/);
});
