import { useRef, useState } from 'react';

// How many deletion actions the undo snackbar remembers (multi‑level
// undo): new actions push onto the end of the stack and the oldest one
// is dropped once the limit is reached.
export const UNDO_LIMIT = 5;

/**
 * The multi‑level undo stack for deletions: each entry holds the removed
 * items (with their original positions) and the list they came from, so
 * undo can restore them there even if the active list changed in the
 * meantime.
 *
 * `apply` re‑inserts one entry's items – the app passes the `insertTasks`
 * mutation from useTasks – so the stack itself stays free of task
 * knowledge.
 *
 * Returns `{ stack, push, undo, close }`:
 *   stack – the pending entries (oldest first); the snackbar offers the
 *           last one; an empty stack means nothing to undo
 *   push – remember a deletion (its items and list id), dropping the
 *          oldest entry once the limit is reached
 *   undo – re‑insert the most recent entry and keep the earlier ones, so
 *          several deletions can be undone in sequence (most recent
 *          first)
 *   close – how a snackbar dismissal is interpreted (event, reason):
 *           "timeout" (the auto‑hide expired) drops only the newest entry
 *           so the previous undo gets its own window; "clickaway" keeps
 *           the stack (the user is just working on more tasks); anything
 *           else (the close button, Escape) is an explicit dismiss and
 *           clears the stack
 */
export function useUndoStack(apply) {
  const [stack, setStack] = useState([]);
  // Monotonically increasing stamp for stack entries: the snackbar is
  // keyed on the latest stamp so each new entry restarts its auto‑hide
  // timer.
  const seq = useRef(0);

  const push = (items, listId) => {
    seq.current += 1;
    const stamp = seq.current;
    setStack((prev) => {
      const next = [...prev, { items, listId, stamp }];
      return next.length > UNDO_LIMIT
        ? next.slice(next.length - UNDO_LIMIT)
        : next;
    });
  };

  const undo = () => {
    if (stack.length === 0) return;
    const latest = stack[stack.length - 1];
    apply(latest.items, latest.listId);
    setStack(stack.slice(0, -1));
  };

  const close = (event, reason) => {
    if (reason === 'timeout') {
      setStack((prev) => prev.slice(0, -1));
      return;
    }
    if (reason === 'clickaway') return;
    setStack([]);
  };

  return { stack, push, undo, close };
}
