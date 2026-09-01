import {
  DEFAULT_LIST_ID,
  DEFAULT_LIST_NAME,
  normalizeList,
  normalizeTasks,
} from './taskNormalize.js';

/**
 * The persisted task payload: what the app stores under its localStorage
 * key and reads back – the storage key, the payload version, parsing
 * (including the upgrade of older payload versions) and the default
 * state the parser falls back to.
 *
 * Kept as pure, exported functions in their own module – no React – so
 * the state hook (hooks/useTasks.js) owns only the runtime state
 * (reducer, persistence effects and the hook API).
 */

// The localStorage key under which the task lists are persisted.
export const STORAGE_KEY = 'tasks';

// The version of the persisted payload. Bump it – and extend
// parseStoredPayload with a migration – whenever the stored shape
// changes, so an older payload is recognized and upgraded instead of
// silently losing data.
export const STORAGE_VERSION = 2;

// The state everything falls back to: a single empty default list.
export function defaultState() {
  return {
    lists: [{ id: DEFAULT_LIST_ID, name: DEFAULT_LIST_NAME, tasks: [] }],
    activeListId: DEFAULT_LIST_ID,
  };
}

/**
 * Parse and normalize a persisted payload into the app state
 * `{ lists, activeListId }`.
 *
 * The current format is `{ version: 2, lists, activeListId }`. v1
 * payloads (`{ version: 1, tasks }`) and the bare task arrays of even
 * earlier versions are upgraded to a single list, so upgrading users
 * keep their tasks. Anything that is not valid JSON or contains no
 * usable lists becomes the default state, never an error.
 */
export function parseStoredPayload(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    console.error('Failed to parse tasks from storage', error);
    return defaultState();
  }

  // v2: { version, lists, activeListId }.
  if (
    parsed &&
    typeof parsed === 'object' &&
    !Array.isArray(parsed) &&
    Array.isArray(parsed.lists)
  ) {
    const lists = parsed.lists.map((list, i) => normalizeList(list, i));
    if (lists.length > 0) {
      const activeListId = lists.some((list) => list.id === parsed.activeListId)
        ? parsed.activeListId
        : lists[0].id;
      return { lists, activeListId };
    }
  }

  // v1 / legacy: a single list of tasks (stored as { version, tasks } or
  // as a bare array).
  const tasks = Array.isArray(parsed)
    ? normalizeTasks(parsed)
    : parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? normalizeTasks(parsed.tasks)
      : [];
  return {
    lists: [{ id: DEFAULT_LIST_ID, name: DEFAULT_LIST_NAME, tasks }],
    activeListId: DEFAULT_LIST_ID,
  };
}
