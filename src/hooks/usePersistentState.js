import { useEffect, useState } from 'react';

/**
 * A useState whose value is mirrored into localStorage (best effort – a
 * failing write is swallowed so that storage‑unavailable browsers, e.g.
 * some private‑browsing modes, stay usable).
 *
 * The value must be a string (it is written to storage verbatim). The
 * initial value is computed by `getInitialState`, a lazy initializer that
 * typically reads the same storage key and validates the stored value.
 *
 * Returns `[value, setValue]` just like useState.
 */
export function usePersistentState(key, getInitialState) {
  const [value, setValue] = useState(getInitialState);

  // Remember the current value (best effort – storage may be unavailable).
  useEffect(() => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore – the value simply will not be persisted
    }
  }, [key, value]);

  return [value, setValue];
}
