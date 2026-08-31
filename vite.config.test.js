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

test('the service worker precaches the app shell for offline use', () => {
  const patterns = pwaOptions.workbox.globPatterns.join(',');
  // index.html must be precached: the navigation route serves it while
  // offline, so omitting html from the patterns breaks offline reloads.
  expect(patterns).toMatch(/html/);
  expect(patterns).toMatch(/js/);
  expect(patterns).toMatch(/css/);
  // The self‑hosted fonts need to survive a disconnect too.
  expect(patterns).toMatch(/woff2/);
  // The install icons (public/icons/*.png) must survive offline, too, so an
  // installed app does not fall back to a generic icon after a disconnect.
  expect(patterns).toMatch(/png/);
});
