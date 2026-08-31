import { normalizeTasks } from '../hooks/useTasks.js';

/**
 * File‑level helpers for exporting and importing the task list as JSON.
 * Kept separate from the UI so the (de)serialization logic can be tested
 * without rendering components.
 */

/** Serialize the task list as pretty‑printed JSON. */
export function tasksToJson(tasks) {
  return JSON.stringify(tasks, null, 2);
}

/**
 * Trigger a browser download of the task list as a JSON file. The file name
 * defaults to `todo-tasks.json`.
 */
export function downloadTasks(tasks, filename = 'todo-tasks.json') {
  const blob = new Blob([tasksToJson(tasks)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Defer the revocation: the download starts asynchronously in some
  // browsers (notably Safari), so revoking the blob URL immediately after
  // the click can cancel it. Giving the browser a moment keeps the download
  // alive while still releasing the URL shortly after.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Parse and validate the text of an imported JSON file.
 *
 * Returns the normalized task array, or `null` when the text is not valid
 * JSON or does not contain a task *list* (an object or string is rejected
 * so an accidental import cannot wipe the current list). The caller shows
 * an error to the user for `null`.
 */
export function parseTasksFile(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  return normalizeTasks(parsed);
}
