// Global test setup for Vitest.
// Loaded once before each test file via the `setupFiles` option in vite.config.js.

import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// localStorage polyfill
// ---------------------------------------------------------------------------
// Whatever `globalThis.localStorage` is in the test environment, it must be a
// plain object so that `vi.spyOn(localStorage, 'setItem')` reliably
// intercepts writes (tests simulate quota errors this way). It is not:
//   - With Node 24 (what CI runs) Vitest's jsdom environment exposes jsdom's
//     own Storage, which is a Proxy: assigning to or defining properties on
//     e.g. `setItem` only stores a string under that key in the storage area,
//     so spies on the instance never intercept anything.
//   - With newer Node versions a native `localStorage` global exists that is
//     `undefined` unless `--localstorage-file` is set (and, being a getter
//     without a setter, cannot simply be reassigned).
// Production code references the `localStorage` global directly, so install a
// minimal in-memory implementation for tests and *always* replace whatever is
// there. Keeping this shim in the test harness (instead of the app source)
// means the production code can safely assume a standard Web API is present.
const store = new Map();
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(String(key), String(value));
    },
    removeItem: (key) => {
      store.delete(String(key));
    },
    clear: () => {
      store.clear();
    },
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  },
  writable: true,
  configurable: true,
});

// ---------------------------------------------------------------------------
// Per-test isolation
// ---------------------------------------------------------------------------
// Now that persistence is backed by a real (polyfilled) store, tasks saved by
// one test would otherwise leak into the next test's initial render. Clear the
// store before every test so each starts from a clean slate.
beforeEach(() => {
  globalThis.localStorage?.clear?.();
});

// Unmount components rendered by the previous test.
//
// @testing-library/react normally registers this cleanup automatically, but
// only when the test framework exposes an `afterEach` global. This project
// runs Vitest *without* `globals: true` (tests import their APIs explicitly),
// so the cleanup is registered here instead.
afterEach(() => {
  cleanup();
});
