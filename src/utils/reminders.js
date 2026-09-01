/**
 * Pure helpers for the local due‑date reminders (browser notifications).
 *
 * A reminder announces – once per day, per task – the unfinished tasks
 * that are due today, as a single summary notification. The payload
 * computation stays pure here so the hook (timing, permission, storage)
 * can stay thin and testable.
 */
import { todayISO } from './dates.js';

/**
 * The unfinished tasks whose due date is the given local calendar date
 * (default: today), in list order.
 */
export function dueOnTasks(tasks, date = todayISO()) {
  return tasks.filter((task) => !task.done && task.due === date);
}

/**
 * The payload of the summary reminder notification for the given tasks:
 * one notification naming up to three of them. `null` when there is
 * nothing to announce.
 */
export function reminderNotification(tasks) {
  if (tasks.length === 0) return null;
  const names = tasks.slice(0, 3).map((task) => task.title);
  const body =
    tasks.length > 3
      ? `${names.join(', ')} and ${tasks.length - 3} more`
      : names.join(', ');
  return {
    title:
      tasks.length === 1 ? 'Task due today' : `${tasks.length} tasks due today`,
    body,
  };
}
