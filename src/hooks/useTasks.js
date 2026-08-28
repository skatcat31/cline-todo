import { useEffect, useReducer, useState } from 'react';

// localStorage key under which the task list is persisted.
export const STORAGE_KEY = 'tasks';

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
    return normalizeTasks(JSON.parse(stored));
  } catch (error) {
    console.error('Failed to parse tasks from storage', error);
    return [];
  }
}

/**
 * Reducer handling all task mutations. Kept as a pure, exported function so
 * it can be unit‑tested without rendering any components.
 *
 * State is the task list – an array of
 *   { id, title, description, done, subtasks: [{ id, title, description, done }] }
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
    case 'edit-task':
      return tasks.map((t) =>
        t.id === action.id
          ? { ...t, title: action.title, description: action.description }
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
    default:
      return tasks;
  }
}

/**
 * Owns the to‑do task list: every mutation plus the localStorage
 * persistence (lazy load before the first render, save on every change).
 *
 * Returns `{ tasks, persistFailed, addTask, toggleTask, deleteTask,
 * editTask, addSubtask, toggleSubtask, deleteSubtask, editSubtask }`.
 * `addSubtask` returns the id of the created subtask so callers can move
 * focus to it after it has rendered. `persistFailed` is true after a
 * persistence attempt could not write to storage (quota exceeded,
 * private‑browsing mode, …) so the UI can warn the user.
 */
export function useTasks() {
  // Lazy initializer: the stored list is read exactly once, before the first
  // render. This avoids the "no tasks yet" flash on load and the redundant
  // write of an empty list that a load‑on‑mount effect would cause.
  const [tasks, dispatch] = useReducer(tasksReducer, undefined, loadTasks);
  // Whether the most recent persistence attempt failed.
  const [persistFailed, setPersistFailed] = useState(false);

  // Persist tasks to storage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
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
      try {
        dispatch({
          type: 'hydrate',
          tasks: normalizeTasks(JSON.parse(event.newValue)),
        });
      } catch (error) {
        console.error('Failed to parse tasks from storage event', error);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return {
    tasks,
    persistFailed,
    addTask: (title, description) =>
      dispatch({
        type: 'add-task',
        title: title.trim(),
        description: description.trim(),
      }),
    toggleTask: (id) => dispatch({ type: 'toggle-task', id }),
    deleteTask: (id) => dispatch({ type: 'delete-task', id }),
    editTask: (id, { title, description }) =>
      dispatch({
        type: 'edit-task',
        id,
        title: title.trim(),
        description: description.trim(),
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
  };
}
