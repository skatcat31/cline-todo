import { useEffect, useReducer, useState } from 'react';
import { normalizeDue } from '../utils/dates.js';

// localStorage key under which the task lists are persisted.
export const STORAGE_KEY = 'tasks';

// The version of the persisted payload. Bump it – and extend
// parseStoredPayload with a migration – whenever the stored shape
// changes, so an older payload is recognized and upgraded instead of
// silently losing data.
export const STORAGE_VERSION = 2;

// Id / name of the single list that pre‑v2 payloads (and fresh storage)
// are upgraded to.
const DEFAULT_LIST_ID = 'default';
const DEFAULT_LIST_NAME = 'To-Do';

// Generate a unique id for new tasks, subtasks and lists. `crypto`
// .randomUUID is only available in secure contexts (https, localhost),
// so fall back to a time/random based id elsewhere instead of crashing.
const nextId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

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
function normalizeList(value, index) {
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

// The state everything falls back to: a single empty default list.
function defaultState() {
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

/**
 * Read and normalize the persisted state. Used as the lazy initializer
 * for the reducer so the very first render already shows the stored
 * lists (no empty‑list flash, no redundant write of an empty state
 * before hydration). Returns the default state when nothing is stored
 * or the stored value cannot be parsed.
 */
function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultState();
    return parseStoredPayload(stored);
  } catch (error) {
    // localStorage itself can throw (e.g. some private‑browsing modes);
    // the app simply starts with the default list then.
    console.error('Failed to read tasks from storage', error);
    return defaultState();
  }
}
/**
 * Reducer handling all list and task mutations. Kept as a pure, exported
 * function so it can be unit‑tested without rendering any components.
 *
 * State is `{ lists, activeListId }` where `lists` is an array of
 *   { id, name, tasks: [
 *       { id, title, description, due, done, subtasks: [
 *         { id, title, description, done } ] }
 *   ] }
 * and `activeListId` is the id of the list the UI shows. `due` is a local
 * "YYYY-MM-DD" date or `null`. Task‑level actions always apply to the
 * active list.
 */
export function tasksReducer(state, action) {
  const { lists, activeListId } = state;

  // Apply a task‑list transform to the active list only. When the
  // transform returns the very same array (a no‑op), the state is kept
  // unchanged so React can skip the re‑render.
  const updateActiveTasks = (fn) => {
    const current = lists.find((list) => list.id === activeListId);
    if (!current) return state;
    const nextTasks = fn(current.tasks);
    if (nextTasks === current.tasks) return state;
    return {
      ...state,
      lists: lists.map((list) =>
        list.id === activeListId ? { ...list, tasks: nextTasks } : list,
      ),
    };
  };

  switch (action.type) {
    case 'hydrate':
      // Replace the whole state with data loaded from storage.
      return action.state;

    // ---- list‑level actions ------------------------------------------
    case 'add-list': {
      // Create a new (empty) list and switch to it.
      const id = nextId();
      return {
        lists: [...lists, { id, name: action.name, tasks: [] }],
        activeListId: id,
      };
    }
    case 'rename-list':
      // Unknown ids leave the state untouched.
      if (!lists.some((list) => list.id === action.id)) return state;
      return {
        ...state,
        lists: lists.map((list) =>
          list.id === action.id ? { ...list, name: action.name } : list,
        ),
      };
    case 'select-list':
      // Switch to an existing list; unknown ids leave the state as is.
      return lists.some((list) => list.id === action.id)
        ? { ...state, activeListId: action.id }
        : state;
    case 'delete-list': {
      // Remove a list (and its tasks). The last remaining list cannot be
      // deleted; deleting the active list falls back to the first of the
      // remaining ones.
      if (lists.length <= 1) return state;
      const next = lists.filter((list) => list.id !== action.id);
      return {
        lists: next,
        activeListId: activeListId === action.id ? next[0].id : activeListId,
      };
    }

    // ---- task‑level actions (active list) ----------------------------
    case 'add-task':
      return updateActiveTasks((tasks) => [
        ...tasks,
        {
          id: nextId(),
          title: action.title,
          description: action.description,
          due: action.due ?? null,
          done: false,
          subtasks: [],
        },
      ]);
    case 'toggle-task':
      return updateActiveTasks((tasks) =>
        tasks.map((t) => (t.id === action.id ? { ...t, done: !t.done } : t)),
      );
    case 'delete-task':
      return updateActiveTasks((tasks) =>
        tasks.filter((t) => t.id !== action.id),
      );
    case 'move-task':
      return updateActiveTasks((tasks) => {
        // Swap the task with its neighbour (the app passes the id of the
        // adjacent task in the *visible* list, so this also works while a
        // filter hides other tasks). Unknown ids or a swap with itself
        // leave the list untouched.
        const fromIndex = tasks.findIndex((t) => t.id === action.id);
        const toIndex = tasks.findIndex((t) => t.id === action.swapId);
        if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
          return tasks;
        }
        const next = [...tasks];
        [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
        return next;
      });
    case 'reorder-task':
      return updateActiveTasks((tasks) => {
        // Move a task to another position (drag and drop): remove it and
        // re‑insert it before or after the target task. Unknown ids, or
        // dropping the task onto itself, leave the list untouched.
        const { id, targetId, after } = action;
        if (id === targetId) return tasks;
        const fromIndex = tasks.findIndex((t) => t.id === id);
        const targetIndex = tasks.findIndex((t) => t.id === targetId);
        if (fromIndex === -1 || targetIndex === -1) return tasks;
        const next = [...tasks];
        const [moved] = next.splice(fromIndex, 1);
        // If the moved task sat above the target, removing it shifted the
        // target one slot up.
        let insertAt = targetIndex - (fromIndex < targetIndex ? 1 : 0);
        if (after) insertAt += 1;
        next.splice(insertAt, 0, moved);
        return next;
      });
    case 'insert-tasks': {
      // Re‑insert previously removed tasks at their remembered positions
      // (used by "undo", for both single deletes and "clear completed").
      // The items go into the list they were removed from (action.listId);
      // if that list no longer exists, the active list is the fallback.
      // Indices are applied in ascending order and clamped so stale
      // positions never drop or corrupt the list.
      const targetId =
        action.listId && lists.some((list) => list.id === action.listId)
          ? action.listId
          : activeListId;
      return {
        ...state,
        lists: lists.map((list) => {
          if (list.id !== targetId) return list;
          const next = [...list.tasks];
          const items = [...action.items].sort((a, b) => a.index - b.index);
          for (const { task, index } of items) {
            const clamped = Math.max(0, Math.min(index, next.length));
            next.splice(clamped, 0, task);
          }
          return { ...list, tasks: next };
        }),
      };
    }
    case 'edit-task':
      return updateActiveTasks((tasks) =>
        tasks.map((t) =>
          t.id === action.id
            ? {
                ...t,
                title: action.title,
                description: action.description,
                due: action.due ?? null,
              }
            : t,
        ),
      );
    case 'add-subtask':
      return updateActiveTasks((tasks) =>
        tasks.map((t) =>
          t.id === action.parentId
            ? {
                ...t,
                subtasks: [
                  ...t.subtasks,
                  {
                    id: action.id,
                    title: action.title,
                    description: action.description,
                    done: false,
                  },
                ],
              }
            : t,
        ),
      );
    case 'toggle-subtask':
      return updateActiveTasks((tasks) =>
        tasks.map((t) =>
          t.id === action.parentId
            ? {
                ...t,
                subtasks: t.subtasks.map((s) =>
                  s.id === action.id ? { ...s, done: !s.done } : s,
                ),
              }
            : t,
        ),
      );
    case 'delete-subtask':
      return updateActiveTasks((tasks) =>
        tasks.map((t) =>
          t.id === action.parentId
            ? { ...t, subtasks: t.subtasks.filter((s) => s.id !== action.id) }
            : t,
        ),
      );
    case 'edit-subtask':
      return updateActiveTasks((tasks) =>
        tasks.map((t) =>
          t.id === action.parentId
            ? {
                ...t,
                subtasks: t.subtasks.map((s) =>
                  s.id === action.id
                    ? {
                        ...s,
                        title: action.title,
                        description: action.description,
                      }
                    : s,
                ),
              }
            : t,
        ),
      );
    case 'clear-completed':
      // Drop every top‑level task of the active list that is marked done.
      return updateActiveTasks((tasks) => tasks.filter((t) => !t.done));
    case 'replace-tasks':
      // Replace the active list's tasks (used by JSON import; the caller
      // passes an already normalized list).
      return updateActiveTasks(() => action.tasks);
    default:
      return state;
  }
}
/**
 * Owns the to‑do task lists: every list and task mutation plus the
 * localStorage persistence (lazy load before the first render, save on
 * every change).
 *
 * Returns `{ tasks, lists, activeListId, persistFailed, addList,
 * renameList, deleteList, selectList, addTask, toggleTask, deleteTask,
 * moveTask, reorderTask, insertTasks, editTask, addSubtask,
 * toggleSubtask, deleteSubtask, editSubtask, clearCompleted,
 * replaceTasks }`.
 * `tasks` is the active list's tasks (what the UI shows and edits); the
 * list‑level operations manage the `lists` array, and the task‑level
 * operations act on the active list.
 * `addSubtask` returns the id of the created subtask so callers can move
 * focus to it after it has rendered. `persistFailed` is true after a
 * persistence attempt could not write to storage (quota exceeded,
 * private‑browsing mode, …) so the UI can warn the user.
 * `insertTasks` re‑adds previously removed tasks at their remembered
 * positions, into the list they were removed from (used for "undo" –
 * single deletes and "clear completed").
 * `replaceTasks` swaps the active list's tasks for a normalized one
 * (JSON import).
 */
export function useTasks() {
  // Lazy initializer: the stored state is read exactly once, before the
  // first render. This avoids the "no tasks yet" flash on load and the
  // redundant write of an empty state that a load‑on‑mount effect would
  // cause.
  const [state, dispatch] = useReducer(tasksReducer, undefined, loadState);
  const { lists, activeListId } = state;
  // The tasks of the active list – what the UI shows and edits. Falls
  // back to the first list if the remembered active list is gone (the
  // reducer normally prevents that, but a hand‑edited payload can do
  // anything).
  const activeList = lists.find((list) => list.id === activeListId) ?? lists[0];
  const tasks = activeList ? activeList.tasks : [];
  // Whether the most recent persistence attempt failed.
  const [persistFailed, setPersistFailed] = useState(false);

  // Persist the lists and the active list to storage whenever they change
  // (as a versioned payload, so future shape changes can be migrated – see
  // parseStoredPayload).
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: STORAGE_VERSION, lists, activeListId }),
      );
      setPersistFailed(false);
    } catch (error) {
      // The write failed – keep the app usable and let the UI warn the user.
      console.error('Failed to persist tasks to storage', error);
      setPersistFailed(true);
    }
  }, [lists, activeListId]);

  // Keep multiple open tabs in sync: when another tab writes the state,
  // re‑hydrate from its value. The event only fires in *other* tabs, so
  // this cannot loop back into this tab's own writes.
  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key !== STORAGE_KEY || event.newValue === null) return;
      // parseStoredPayload accepts all payload versions and never throws.
      dispatch({ type: 'hydrate', state: parseStoredPayload(event.newValue) });
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return {
    tasks,
    lists,
    activeListId,
    persistFailed,
    // ---- list operations ----------------------------------------------
    // Create a new (empty) list and switch to it.
    addList: (name) => dispatch({ type: 'add-list', name: name.trim() }),
    // Rename a list (the app trims; the reducer trusts the hook).
    renameList: (id, name) =>
      dispatch({ type: 'rename-list', id, name: name.trim() }),
    // Delete a list and its tasks (the last remaining list is protected).
    deleteList: (id) => dispatch({ type: 'delete-list', id }),
    // Switch the active list (unknown ids are ignored).
    selectList: (id) => dispatch({ type: 'select-list', id }),
    // ---- task operations (active list) ---------------------------------
    addTask: (title, description, due) =>
      dispatch({
        type: 'add-task',
        title: title.trim(),
        description: description.trim(),
        due: normalizeDue(due),
      }),
    toggleTask: (id) => dispatch({ type: 'toggle-task', id }),
    deleteTask: (id) => dispatch({ type: 'delete-task', id }),
    // Swap a task with its neighbour in the active list (the app passes
    // the id of the adjacent task in the currently visible list).
    moveTask: (id, swapId) => dispatch({ type: 'move-task', id, swapId }),
    // Move a task before/after another one (drag and drop: the ids are
    // those of the dragged task and the row it was dropped on).
    reorderTask: (id, targetId, after) =>
      dispatch({ type: 'reorder-task', id, targetId, after }),
    // Re‑add previously removed tasks at their remembered positions, into
    // the list given (used by "undo" – single deletes and "clear
    // completed").
    insertTasks: (items, listId) =>
      dispatch({ type: 'insert-tasks', items, listId }),
    editTask: (id, { title, description, due }) =>
      dispatch({
        type: 'edit-task',
        id,
        title: title.trim(),
        description: description.trim(),
        due: normalizeDue(due),
      }),
    addSubtask: (parentId, { title, description }) => {
      const id = nextId();
      dispatch({
        type: 'add-subtask',
        parentId,
        id,
        title: title.trim(),
        description: description.trim(),
      });
      return id;
    },
    toggleSubtask: (parentId, id) =>
      dispatch({ type: 'toggle-subtask', parentId, id }),
    deleteSubtask: (parentId, id) =>
      dispatch({ type: 'delete-subtask', parentId, id }),
    editSubtask: (parentId, id, { title, description }) =>
      dispatch({
        type: 'edit-subtask',
        parentId,
        id,
        title: title.trim(),
        description: description.trim(),
      }),
    clearCompleted: () => dispatch({ type: 'clear-completed' }),
    // Swap the active list's tasks for an already normalized one (JSON
    // import).
    replaceTasks: (nextTasks) =>
      dispatch({ type: 'replace-tasks', tasks: nextTasks }),
  };
}
