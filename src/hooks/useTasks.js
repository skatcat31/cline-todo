import { useEffect, useReducer } from 'react';

// localStorage key under which the task list is persisted.
const STORAGE_KEY = 'tasks';

// Generate a unique id for new tasks and subtasks.
const nextId = () => crypto.randomUUID();

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
    default:
      return tasks;
  }
}

/**
 * Owns the to‑do task list: every mutation plus the localStorage
 * persistence (load on mount, save on every change).
 *
 * Returns `{ tasks, addTask, toggleTask, deleteTask, editTask,
 * addSubtask, toggleSubtask, deleteSubtask, editSubtask }`.
 * `addSubtask` returns the id of the created subtask so callers can move
 * focus to it after it has rendered.
 */
export function useTasks() {
  const [tasks, dispatch] = useReducer(tasksReducer, []);

  // Load tasks from storage on component mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      // Validate/normalize before using: stored data is untrusted.
      dispatch({
        type: 'hydrate',
        tasks: normalizeTasks(JSON.parse(stored)),
      });
    } catch (error) {
      console.error('Failed to parse tasks from storage', error);
    }
  }, []);

  // Persist tasks to storage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  return {
    tasks,
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
  };
}
