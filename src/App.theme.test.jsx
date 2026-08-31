// Color scheme: light/system/dark selection, persistence and following the OS.
import App from './App';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// Compatibility layer for jest-dom with Vitest
import '@testing-library/jest-dom/vitest';
import { test, expect, vi } from 'vitest';

/**
 * The app bar offers light/system/dark color‑scheme choices; the choice is
 * persisted so a "reload" keeps the selected color scheme.
 */
test('selects the dark theme and persists the choice', async () => {
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: 'Dark theme' }));

  expect(screen.getByRole('button', { name: 'Dark theme' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(localStorage.getItem('todo-theme')).toBe('dark');
});

/**
 * An explicitly stored theme preference wins over the OS preference.
 */
test('uses the stored theme preference', () => {
  localStorage.setItem('todo-theme', 'system');
  render(<App />);
  expect(screen.getByRole('button', { name: 'System theme' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

/**
 * A stored value that is not a legal scheme falls back to "system".
 */
test('falls back to the system scheme for an invalid stored value', () => {
  localStorage.setItem('todo-theme', 'neon');
  render(<App />);
  expect(screen.getByRole('button', { name: 'System theme' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

/**
 * A stand‑in for window.matchMedia whose reported preference can be flipped
 * at runtime, letting tests simulate an OS color‑scheme change (jsdom does
 * not implement matchMedia at all). `setPrefersDark` notifies the registered
 * listeners the way a real media query would.
 */
function mockSystemPreference(initiallyDark) {
  let matches = initiallyDark;
  const handlers = [];
  window.matchMedia = vi.fn().mockImplementation(() => ({
    get matches() {
      return matches;
    },
    addEventListener: (type, handler) => {
      if (type === 'change') handlers.push(handler);
    },
    removeEventListener: (type, handler) => {
      const index = handlers.indexOf(handler);
      if (index >= 0) handlers.splice(index, 1);
    },
  }));
  return {
    setPrefersDark(next) {
      matches = next;
      handlers.forEach((handler) => handler({ matches: next }));
    },
  };
}

/**
 * Without a stored preference the app follows the OS color‑scheme setting:
 * the default "system" scheme resolves to the OS choice.
 */
test('follows the system preference when no scheme is stored', () => {
  const originalMatchMedia = window.matchMedia;
  mockSystemPreference(true);
  try {
    render(<App />);
    expect(document.documentElement).toHaveClass('dark');
    // The mode itself stays "system" – only the resolution follows the OS
    expect(localStorage.getItem('todo-theme')).toBe('system');
  } finally {
    window.matchMedia = originalMatchMedia;
  }
});

/**
 * While the "system" scheme is active, an OS color‑scheme change re‑themes
 * the app without a reload; an explicit light/dark choice ignores it.
 */
test('reacts to system preference changes in system mode', async () => {
  const originalMatchMedia = window.matchMedia;
  const system = mockSystemPreference(false);
  try {
    render(<App />);
    expect(document.documentElement).not.toHaveClass('dark');

    // The OS flips to dark – the app follows (the mode stays "system")
    act(() => {
      system.setPrefersDark(true);
    });
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('todo-theme')).toBe('system');

    // An explicit choice wins over the OS preference
    await userEvent.click(screen.getByRole('button', { name: 'Light theme' }));
    act(() => {
      system.setPrefersDark(true);
    });
    expect(document.documentElement).not.toHaveClass('dark');
  } finally {
    window.matchMedia = originalMatchMedia;
  }
});
