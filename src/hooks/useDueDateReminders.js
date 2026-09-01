import { useCallback, useEffect, useState } from 'react';
import { todayISO } from '../utils/dates.js';
import { dueOnTasks, reminderNotification } from '../utils/reminders.js';

// localStorage keys: the persisted on/off choice, and the per‑day log of
// the task ids that have already been announced (so a reload or a
// re‑check does not announce the same task twice on the same day).
const REMINDERS_KEY = 'todo-reminders';
const REMINDERS_LOG_KEY = 'todo-reminder-log';

// How often (while the app is open) the due‑today check re‑runs.
const CHECK_INTERVAL_MS = 60_000;

/**
 * The local due‑date reminders: while the browser allows notifications
 * and the feature is switched on, the app announces – once per day per
 * task – the unfinished tasks that are due today (as one summary
 * notification).
 *
 * `tasks` is the current task list; the check re‑runs when it changes,
 * every CHECK_INTERVAL_MS, and whenever the tab becomes visible again
 * (background tabs throttle timers, so the interval alone is not
 * reliable).
 *
 * Returns `{ permission, enabled, requestPermission, toggleEnabled }`:
 *   permission – the Notification permission ("granted" | "denied" |
 *     "default", or "unsupported" when the API is missing)
 *   enabled – the persisted on/off choice (only relevant when granted)
 *   requestPermission – asks the browser for permission (needs a user
 *     gesture, so call it from a click handler)
 *   toggleEnabled – flips the persisted on/off choice
 */
export function useDueDateReminders(tasks) {
  const [permission, setPermission] = useState(() =>
    typeof Notification !== 'undefined'
      ? Notification.permission
      : 'unsupported',
  );
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem(REMINDERS_KEY) !== 'off';
    } catch {
      return true;
    }
  });

  // Ask the browser for notification permission; the promise resolves
  // with the (possibly unchanged) permission state.
  const requestPermission = useCallback(() => {
    if (typeof Notification === 'undefined') return;
    Notification.requestPermission().then((result) => {
      setPermission(result);
    });
  }, []);

  // Flip the persisted on/off choice.
  const toggleEnabled = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(REMINDERS_KEY, next ? 'on' : 'off');
      } catch {
        // ignore – the choice simply will not be persisted
      }
      return next;
    });
  }, []);

  // Announce the tasks that are due today and have not been announced
  // earlier today. The per‑day id log (keyed by date) survives reloads,
  // so each task is announced at most once a day. Only today's log entry
  // is ever written back – a day's log is only useful on that day, so
  // older entries are pruned instead of accumulating.
  const announce = useCallback(() => {
    if (permission !== 'granted' || !enabled) return;
    if (typeof Notification === 'undefined') return;
    const today = todayISO();
    let log = {};
    try {
      const stored = JSON.parse(
        localStorage.getItem(REMINDERS_LOG_KEY) ?? '{}',
      );
      if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
        log = stored;
      }
    } catch {
      // unreadable log – treat everything as not announced yet
    }
    const announced = new Set(Array.isArray(log[today]) ? log[today] : []);
    const fresh = dueOnTasks(tasks).filter((task) => !announced.has(task.id));
    if (fresh.length === 0) return;
    for (const date of Object.keys(log)) {
      if (date !== today) delete log[date];
    }
    log[today] = [...announced, ...fresh.map((task) => task.id)];
    try {
      localStorage.setItem(REMINDERS_LOG_KEY, JSON.stringify(log));
    } catch {
      // unwritable log – the reminder itself still goes out
    }
    const payload = reminderNotification(fresh);
    // The side effect is the notification itself (the Notification API
    // only exposes a constructor).
    new Notification(payload.title, { body: payload.body });
  }, [permission, enabled, tasks]);

  // Run the check on mount, on a slow interval, and whenever the tab
  // becomes visible again.
  useEffect(() => {
    announce();
    const interval = setInterval(announce, CHECK_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') announce();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [announce]);

  return { permission, enabled, requestPermission, toggleEnabled };
}
