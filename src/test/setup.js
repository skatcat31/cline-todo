// Global test setup for Vitest.
// Loaded once before each test file via the `setupFiles` option in vite.config.js.

import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// localStorage polyfill
// ---------------------------------------------------------------------------
// In the test environment `globalThis.localStorage` is not defined (jsdom does
// not expose Web Storage here and Node's experimental global is disabled).
// Production code in `App.jsx` references the `localStorage` global directly,
// so we install a minimal in-memory implementation for tests. Keeping this shim
// in the test harness (instead of the app source) means the production code can
// safely assume a standard Web API is present.
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
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
  };
}

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
