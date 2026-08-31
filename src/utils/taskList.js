/**
 * Pure list‑level operations on the task list.
 *
 * These are the app‑level orchestration computations that used to be
 * inlined in App.jsx (filtering, counters, the "clear completed" undo
 * payload, import merging). Kept as pure, exported functions so they can
 * be unit‑tested without rendering any components, and so the reducer
 * (per‑task mutations) and the app (UI wiring) stay focused.
 */

/**
 * The task list as shown by the active filter ("all" | "active" |
 * "completed"). Unknown filter values fall back to the whole list.
 */
export function visibleTasks(tasks, filter) {
  switch (filter) {
    case 'active':
      return tasks.filter((task) => !task.done);
    case 'completed':
      return tasks.filter((task) => task.done);
    default:
      return tasks;
  }
}

/**
 * The counters shown by the filter bar: how many tasks are active, how
 * many are completed, and the total.
 */
export function taskCounts(tasks) {
  const active = tasks.filter((task) => !task.done).length;
  return { active, completed: tasks.length - active, total: tasks.length };
}

/**
 * The completed tasks together with their original positions, in list
 * order – the payload of the "clear completed" undo snackbar (insertTasks
 * re‑adds them at exactly these indices).
 */
export function completedItems(tasks) {
  return tasks
    .map((task, index) => ({ task, index }))
    .filter(({ task }) => task.done);
}

/** The index of the task with the given id, or -1 when absent. */
export function indexOfTask(tasks, id) {
  return tasks.findIndex((task) => task.id === id);
}

/**
 * Merge an imported list into the current one: keep the current tasks and
 * append the imported ones that do not already exist (matched by id), so
 * merging never duplicates or overwrites existing tasks.
 */
export function mergeTasks(existing, incoming) {
  const existingIds = new Set(existing.map((task) => task.id));
  return [...existing, ...incoming.filter((task) => !existingIds.has(task.id))];
}

/**
 * The tasks matching a search query (case‑insensitive substring match on
 * the task title, the task description or any subtask title). An empty or
 * whitespace‑only query matches every task.
 */
export function tasksMatching(tasks, query) {
  const needle = query.trim().toLowerCase();
  if (!needle) return tasks;
  return tasks.filter((task) => {
    if (task.title.toLowerCase().includes(needle)) return true;
    if (task.description.toLowerCase().includes(needle)) return true;
    return task.subtasks.some((subtask) =>
      subtask.title.toLowerCase().includes(needle),
    );
  });
}
