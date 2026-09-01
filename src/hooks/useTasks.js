import { useEffect, useReducer, useState } from 'react';
import { normalizeDue } from '../utils/dates.js';

// localStorage key under which the task list is persisted.
export const STORAGE_KEY = 'tasks';

// The version of the persisted payload. Bump it – and extend
// parseStoredTasks with a migration – whenever the stored shape changes, so
// an older payload is recognized and upgraded instead of silently losing
// data.
export const STORAGE_VERSION = 1;

// Generate a unique id for new tasks and subtasks. `crypto.randomUUID` is
// only available in secure contexts (https, localhost), so fall back to a
// time/random based id elsewhere instead of crashing.
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

/**
 * Parse and normalize a persisted task payload.
 *
 * The current format is `{ version, tasks }`; earlier versions (and hand
 * edited storage) held a bare task array, so both are accepted – upgrading
 * users keep their list. Anything that is not valid JSON or does not
 * contain a task list becomes an empty list, never an error.
 */
export function parseStoredTasks(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    console.error('Failed to parse tasks from storage', error);
    return [];
  }
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return normalizeTasks(parsed.tasks);
  }
  return normalizeTasks(parsed);
}

/**
 * Read and normalize the persisted task list. Used as the lazy initializer
 * for the reducer so the very first render already shows the stored tasks
 * (no empty‑list flash, no redundant write of an empty list before
 * hydration). Returns an empty list when nothing is stored or the stored
 * value cannot be parsed.
 */
function loadTasks() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return parseStoredTasks(stored);
  } catch (error) {
    // localStorage itself can throw (e.g. some private‑browsing modes);
    // the list simply starts empty then.
    console.error('Failed to read tasks from storage', error);
    return [];
  }
}

/**
 * Reducer handling all task mutations. Kept as a pure, exported function so
 * it can be unit‑tested without rendering any components.
 *
 * State is the task list – an array of
 *   { id, title, description, due, done, subtasks: [{ id, title, description, done }] }
 * `due` is a local "YYYY-MM-DD" date or `null`.
 */
export function tasksReducer(tasks, action) {
  switch (action.type) {
    case 'hydrate':
      // Replace the list with data loaded from storage.
      return action.tasks;
    case 'add-task':
      return [
        ...tasks,
        {
          id: nextId(),
          title: action.title,
          description: action.description,
          due: action.due ?? null,
          done: false,
          subtasks: [],
        },
      ];
    case 'toggle-task':
      return tasks.map((t) =>
        t.id === action.id ? { ...t, done: !t.done } : t,
      );
    case 'delete-task':
      return tasks.filter((t) => t.id !== action.id);
    case 'move-task': {
      // Swap the task with its neighbour (the app passes the id of the
      // adjacent task in the *visible* list, so this also works while a
      // filter hides other tasks). Unknown ids or a swap with itself leave
      // the list untouched.
      const fromIndex = tasks.findIndex((t) => t.id === action.id);
      const toIndex = tasks.findIndex((t) => t.id === action.swapId);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        return tasks;
      }
      const next = [...tasks];
      [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
      return next;
    }
    case 'reorder-task': {
      // Move a task to another position (drag and drop): remove it and
      // re‑insert it before or after the target task – the app passes the
      // id of the row the task was dropped on plus which half of that row
      // the drop landed in. Unknown ids, or dropping the task onto itself,
      // leave the list untouched.
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
    }
    case 'insert-tasks': {
      // Re‑insert previously removed tasks at their remembered
      // positions (used by "undo", for both single deletes and "clear
      // completed"). Indices are applied in ascending order and clamped
      // so stale positions never drop or corrupt the list.
      const next = [...tasks];
      const items = [...action.items].sort((a, b) => a.index - b.index);
      for (const { task, index } of items) {
        const clamped = Math.max(0, Math.min(index, next.length));
        next.splice(clamped, 0, task);
      }
      return next;
    }
    case 'edit-task':
      return tasks.map((t) =>
        t.id === action.id
          ? {
              ...t,
              title: action.title,
              description: action.description,
              due: action.due ?? null,
            }
          : t,
      );
    case 'add-subtask':
      return tasks.map((t) =>
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
      );
    case 'toggle-subtask':
      return tasks.map((t) =>
        t.id === action.parentId
          ? {
              ...t,
              subtasks: t.subtasks.map((s) =>
                s.id === action.id ? { ...s, done: !s.done } : s,
              ),
            }
          : t,
      );
    case 'delete-subtask':
      return tasks.map((t) =>
        t.id === action.parentId
          ? { ...t, subtasks: t.subtasks.filter((s) => s.id !== action.id) }
          : t,
      );
    case 'edit-subtask':
      return tasks.map((t) =>
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
      );
    case 'clear-completed':
      // Drop every top‑level task that is marked done.
      return tasks.filter((t) => !t.done);
    case 'replace-tasks':
      // Replace the whole list (used by JSON import; the caller passes an
      // already normalized list).
      return action.tasks;
    default:
      return tasks;
  }
}

/**
 * Owns the to‑do task list: every mutation plus the localStorage
 * persistence (lazy load before the first render, save on every change).
 *
 * Returns `{ tasks, persistFailed, addTask, toggleTask, deleteTask,
 * moveTask, reorderTask, insertTasks, editTask, addSubtask,
 * toggleSubtask, deleteSubtask, editSubtask, clearCompleted,
 * replaceTasks }`.
 * `addSubtask` returns the id of the created subtask so callers can move
 * focus to it after it has rendered. `persistFailed` is true after a
 * persistence attempt could not write to storage (quota exceeded,
 * private‑browsing mode, …) so the UI can warn the user.
 * `insertTasks` re‑adds previously removed tasks at their remembered
 * positions (used for "undo" - single deletes and "clear completed").
 * `replaceTasks` swaps the whole list for a normalized one (JSON import).
 */
export function useTasks() {
  // Lazy initializer: the stored list is read exactly once, before the first
  // render. This avoids the "no tasks yet" flash on load and the redundant
  // write of an empty list that a load‑on‑mount effect would cause.
  const [tasks, dispatch] = useReducer(tasksReducer, undefined, loadTasks);
  // Whether the most recent persistence attempt failed.
  const [persistFailed, setPersistFailed] = useState(false);

  // Persist tasks to storage whenever they change (as a versioned payload,
  // so future shape changes can be migrated – see parseStoredTasks).
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: STORAGE_VERSION, tasks }),
      );
      setPersistFailed(false);
    } catch (error) {
      // The write failed – keep the app usable and let the UI warn the user.
      console.error('Failed to persist tasks to storage', error);
      setPersistFailed(true);
    }
  }, [tasks]);

  // Keep multiple open tabs in sync: when another tab writes the task list,
  // re‑hydrate from its value. The event only fires in *other* tabs, so this
  // cannot loop back into this tab's own writes.
  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key !== STORAGE_KEY || event.newValue === null) return;
      // parseStoredTasks accepts both payload versions and never throws.
      dispatch({ type: 'hydrate', tasks: parseStoredTasks(event.newValue) });
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return {
    tasks,
    persistFailed,
    addTask: (title, description, due) =>
      dispatch({
        type: 'add-task',
        title: title.trim(),
        description: description.trim(),
        due: normalizeDue(due),
      }),
    toggleTask: (id) => dispatch({ type: 'toggle-task', id }),
    deleteTask: (id) => dispatch({ type: 'delete-task', id }),
    // Swap a task with its neighbour in the full list (the app passes the
    // id of the adjacent task in the currently visible list).
    moveTask: (id, swapId) => dispatch({ type: 'move-task', id, swapId }),
    // Move a task before/after another one (drag and drop: the ids are
    // those of the dragged task and the row it was dropped on).
    reorderTask: (id, targetId, after) =>
      dispatch({ type: 'reorder-task', id, targetId, after }),
    // Re‑add previously removed tasks at their remembered positions
    // (used by "undo" - single deletes and "clear completed").
    insertTasks: (items) => dispatch({ type: 'insert-tasks', items }),
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
    // Swap the whole list for an already normalized one (JSON import).
    replaceTasks: (nextTasks) =>
      dispatch({ type: 'replace-tasks', tasks: nextTasks }),
  };
}
