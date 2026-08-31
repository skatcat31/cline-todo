/**
 * Pure helpers for task due dates.
 *
 * Due dates are stored as local calendar dates in "YYYY-MM-DD" form (no
 * time component), so comparing two due dates is a plain string
 * comparison. Kept separate from the UI and the reducer so the date logic
 * can be unit‑tested without rendering components.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Format a Date as a local "YYYY-MM-DD" calendar date (no time part, and –
 * unlike toISOString – not shifted into UTC).
 */
export function toISODate(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

/** Today's local calendar date ("YYYY-MM-DD"). */
export function todayISO() {
  return toISODate(new Date());
}

/**
 * Whether a value is a real local calendar date in "YYYY-MM-DD" form.
 * Catches both malformed strings ("2026-1-5") and impossible dates
 * ("2026-02-30").
 */
export function isValidISODate(value) {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Coerce a stored/entered due date to the canonical shape: a valid
 * "YYYY-MM-DD" string, or `null` for anything else (missing due dates,
 * hand‑edited storage, bad imports).
 */
export function normalizeDue(value) {
  return isValidISODate(value) ? value : null;
}

/**
 * Format a stored due date for display, e.g. "Sep 15" (or "Sep 15, 2030"
 * when the date is not in the current year). Returns '' for a missing
 * due date. The locale is pinned to en‑US – the rest of the app UI is
 * English‑only, and a fixed locale keeps the display (and the tests)
 * deterministic regardless of the browser/system locale.
 */
export function formatDueDate(due) {
  if (!isValidISODate(due)) return '';
  const [year, month, day] = due.split('-').map(Number);
  const options = { month: 'short', day: 'numeric' };
  if (year !== new Date().getFullYear()) options.year = 'numeric';
  return new Date(year, month - 1, day).toLocaleDateString('en-US', options);
}

/**
 * The due‑date badge for a task: `{ text, severity }` where severity is
 * "error" (overdue), "warning" (due today) or "default" (future / done).
 * Returns `null` when the task has no due date.
 */
export function dueBadge(task) {
  const due = normalizeDue(task.due);
  if (!due) return null;
  const today = todayISO();
  if (!task.done && due < today) {
    return { text: `Overdue (due ${formatDueDate(due)})`, severity: 'error' };
  }
  if (!task.done && due === today) {
    return { text: 'Due today', severity: 'warning' };
  }
  return { text: `Due ${formatDueDate(due)}`, severity: 'default' };
}
