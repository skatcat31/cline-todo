import { normalizeDue } from './dates.js';

/**
 * Normalization of task and list data read from untrusted sources
 * (localStorage, JSON imports).
 *
 * Kept as pure, exported functions in their own module – no React, no
 * storage access – so the state hook (hooks/useTasks.js) and the file
 * helpers (utils/taskFile.js) share the same validation without a
 * utils → hooks dependency.
 */

// Id / name of the single list that pre‑v2 payloads (and fresh storage)
// are upgraded to.
export const DEFAULT_LIST_ID = 'default';
export const DEFAULT_LIST_NAME = 'To-Do';

/**
 * Validate and normalize a task list loaded from storage.
 *
 * localStorage is not trustworthy (older app versions, hand edits or a
 * half-written value can produce a malformed shape), so anything that does
 * not look like a task/subtask is dropped and the remaining entries are
 * coerced to the exact shape the UI expects.
 */
export function normalizeTasks(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (task) =>
        task &&
        typeof task === 'object' &&
        typeof task.id === 'string' &&
        typeof task.title === 'string',
    )
    .map((task) => ({
      id: task.id,
      title: task.title,
      description: typeof task.description === 'string' ? task.description : '',
      due: normalizeDue(task.due),
      done: Boolean(task.done),
      subtasks: Array.isArray(task.subtasks)
        ? task.subtasks
            .filter(
              (subtask) =>
                subtask &&
                typeof subtask === 'object' &&
                typeof subtask.id === 'string' &&
                typeof subtask.title === 'string',
            )
            .map((subtask) => ({
              id: subtask.id,
              title: subtask.title,
              description:
                typeof subtask.description === 'string'
                  ? subtask.description
                  : '',
              done: Boolean(subtask.done),
            }))
        : [],
    }));
}

// Normalize one stored list entry to { id, name, tasks }: entries without
// a usable string id get a generated one, and a missing/blank name falls
// back to the default list name.
export function normalizeList(value, index) {
  const id =
    value && typeof value === 'object' && typeof value.id === 'string'
      ? value.id
      : `list-${index}`;
  const name =
    value &&
    typeof value === 'object' &&
    typeof value.name === 'string' &&
    value.name.trim()
      ? value.name
      : DEFAULT_LIST_NAME;
  return { id, name, tasks: normalizeTasks(value ? value.tasks : undefined) };
}
