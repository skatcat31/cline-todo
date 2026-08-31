import { describe, expect, test } from 'vitest';
import {
  completedItems,
  indexOfTask,
  mergeTasks,
  taskCounts,
  visibleTasks,
} from './taskList.js';

const tasks = [
  { id: 'a', title: 'A', description: '', done: false, subtasks: [] },
  { id: 'b', title: 'B', description: '', done: true, subtasks: [] },
  { id: 'c', title: 'C', description: '', done: false, subtasks: [] },
];

describe('visibleTasks', () => {
  test('shows every task for the "all" filter', () => {
    expect(visibleTasks(tasks, 'all')).toBe(tasks);
  });

  test('shows only the not‑done tasks for "active"', () => {
    expect(visibleTasks(tasks, 'active').map((t) => t.id)).toEqual(['a', 'c']);
  });

  test('shows only the done tasks for "completed"', () => {
    expect(visibleTasks(tasks, 'completed').map((t) => t.id)).toEqual(['b']);
  });

  test('falls back to the whole list for an unknown filter value', () => {
    expect(visibleTasks(tasks, 'bogus')).toBe(tasks);
  });
});

describe('taskCounts', () => {
  test('counts the active, completed and total tasks', () => {
    expect(taskCounts(tasks)).toEqual({ active: 2, completed: 1, total: 3 });
  });

  test('handles an empty list', () => {
    expect(taskCounts([])).toEqual({ active: 0, completed: 0, total: 0 });
  });
});

describe('completedItems', () => {
  test('returns the done tasks with their original indices', () => {
    expect(completedItems(tasks)).toEqual([{ task: tasks[1], index: 1 }]);
  });

  test('returns an empty list when nothing is completed', () => {
    expect(completedItems(tasks.filter((t) => !t.done))).toEqual([]);
  });
});

describe('indexOfTask', () => {
  test('finds the index of the task with the given id', () => {
    expect(indexOfTask(tasks, 'b')).toBe(1);
  });

  test('returns -1 for an unknown id', () => {
    expect(indexOfTask(tasks, 'nope')).toBe(-1);
  });
});

describe('mergeTasks', () => {
  test('appends imported tasks that do not exist yet', () => {
    const imported = [
      { id: 'd', title: 'D', description: '', done: false, subtasks: [] },
    ];
    expect(mergeTasks(tasks, imported).map((t) => t.id)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
  });

  test('skips imported tasks whose id already exists (no overwrite)', () => {
    const imported = [
      {
        id: 'a',
        title: 'A replaced',
        description: '',
        done: true,
        subtasks: [],
      },
      { id: 'd', title: 'D', description: '', done: false, subtasks: [] },
    ];
    const merged = mergeTasks(tasks, imported);
    expect(merged.map((t) => t.id)).toEqual(['a', 'b', 'c', 'd']);
    // The existing task keeps its own title/done state (same reference).
    expect(merged[0]).toBe(tasks[0]);
  });

  test('keeps the existing list untouched when the import is empty', () => {
    const merged = mergeTasks(tasks, []);
    expect(merged.map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });
});
