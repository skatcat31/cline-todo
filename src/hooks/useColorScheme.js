import { useEffect, useMemo, useState } from 'react';
import { createAppTheme } from '../theme.js';

// localStorage key for the color scheme preference.
export const THEME_KEY = 'todo-theme';

// The legal color scheme choices ("system" follows the OS setting).
export const THEME_MODES = ['light', 'system', 'dark'];

const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * Whether the OS currently prefers a dark color scheme (false when the
 * platform does not expose the preference, e.g. jsdom).
 */
function systemPrefersDark() {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia(DARK_QUERY).matches
  );
}

/**
 * Read the persisted color scheme; a missing or invalid value falls back to
 * following the OS preference.
 */
function readStoredMode() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (THEME_MODES.includes(stored)) return stored;
  } catch {
    // storage unavailable – fall through
  }
  return 'system';
}

/**
 * Owns the color scheme choice ("light" | "system" | "dark"):
 *
 *   - remembers it in localStorage,
 *   - follows the OS preference live while in "system" mode,
 *   - resolves the choice to a concrete light/dark MUI theme,
 *   - marks <html class="dark"> so styles (and tests) outside the MUI theme
 *     can tell the effective scheme apart.
 *
 * Returns `{ mode, setMode, theme }`.
 */
export function useColorScheme() {
  const [mode, setMode] = useState(readStoredMode);
  // The live OS preference; only in "system" mode does it affect the
  // resolved theme.
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  // Track OS preference changes while mounted (one media query, cheap).
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia(DARK_QUERY);
    const handleChange = (event) => setSystemDark(event.matches);
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  // Remember the choice (best effort – storage may be unavailable).
  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, mode);
    } catch {
      // ignore – the value simply will not be persisted
    }
  }, [mode]);

  const resolved = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;

  // Mark the document with the effective scheme (see above).
  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark');
  }, [resolved]);

  // Build the theme only when the effective scheme actually changes.
  const theme = useMemo(() => createAppTheme(resolved), [resolved]);

  return { mode, setMode, theme };
}
