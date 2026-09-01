import { useEffect, useRef, useState } from 'react';

/**
 * A useState whose value is mirrored into localStorage (best effort – a
 * failing write is swallowed so that storage‑unavailable browsers, e.g.
 * some private‑browsing modes, stay usable).
 *
 * The value must be a string (it is written to storage verbatim). The
 * initial value is computed by `getInitialState`, a lazy initializer that
 * typically reads the same storage key and validates the stored value.
 *
 * The effect skips its first run: the value was just read from storage
 * (or defaulted), so writing it back would only duplicate what is
 * already stored. From the first change on, the value is mirrored on
 * every update.
 *
 * Returns `[value, setValue]` just like useState.
 */
export function usePersistentState(key, getInitialState) {
  const [value, setValue] = useState(getInitialState);
  // Marks the mount so the effect can skip its first run (the value was
  // just loaded – there is nothing new to persist yet).
  const didMount = useRef(false);

  // Remember the current value (best effort – storage may be unavailable).
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore – the value simply will not be persisted
    }
  }, [key, value]);

  return [value, setValue];
}
