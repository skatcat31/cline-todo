// The Vite config also carries the PWA manifest and the service worker's
// precache pattern. Both matter for offline support, so they are asserted
// here – importing the config only instantiates plugins, it does not
// trigger a build.
import { expect, test } from 'vitest';
import {
  injectSecurityMeta,
  pwaOptions,
  securityMetaTag,
} from './vite.config.js';

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

test('the production build injects a Content-Security-Policy meta tag', () => {
  // GitHub Pages cannot set response headers, so the CSP must travel with
  // the built index.html – but the dev server must stay unaffected, where
  // the policy would block Vite's HMR websocket.
  expect(injectSecurityMeta.apply).toBe('build');

  const html = '<html><head><title>To‑Do List</title></head></html>';
  const transformed = injectSecurityMeta.transformIndexHtml(html);
  expect(transformed).toContain(securityMetaTag);
  // The app is self‑hosted: no third‑party origins, no objects.
  expect(securityMetaTag).toContain("default-src 'self'");
  expect(securityMetaTag).toContain("object-src 'none'");
  // Emotion injects <style> elements at runtime, so inline styles must
  // stay allowed – otherwise the app would render unstyled.
  expect(securityMetaTag).toContain("style-src 'self' 'unsafe-inline'");
});
