import { describe, expect, test } from 'vitest';
import {
  completedItems,
  indexOfTask,
  mergeTasks,
  sortTasksByDue,
  tasksMatching,
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

describe('tasksMatching', () => {
  const searchable = [
    {
      id: 'a',
      title: 'Buy milk',
      description: 'whole milk, two liters',
      done: false,
      subtasks: [],
    },
    {
      id: 'b',
      title: 'Ship release',
      description: '',
      done: false,
      subtasks: [
        { id: 'b1', title: 'Write changelog', description: '', done: false },
      ],
    },
    {
      id: 'c',
      title: 'Call dentist',
      description: '',
      done: false,
      subtasks: [],
    },
  ];

  test('matches task titles case‑insensitively', () => {
    expect(tasksMatching(searchable, 'milk').map((t) => t.id)).toEqual(['a']);
    expect(tasksMatching(searchable, 'MILK').map((t) => t.id)).toEqual(['a']);
  });

  test('matches task descriptions', () => {
    expect(tasksMatching(searchable, 'two liters').map((t) => t.id)).toEqual([
      'a',
    ]);
  });

  test('matches subtask titles', () => {
    expect(tasksMatching(searchable, 'changelog').map((t) => t.id)).toEqual([
      'b',
    ]);
  });

  test('returns every task for an empty or whitespace query', () => {
    expect(tasksMatching(searchable, '')).toBe(searchable);
    expect(tasksMatching(searchable, '   ').map((t) => t.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  test('returns an empty list when nothing matches', () => {
    expect(tasksMatching(searchable, 'zzz')).toEqual([]);
  });
});

describe('sortTasksByDue', () => {
  const due = [
    { id: 'a', title: 'A', due: '2026-03-15', done: false, subtasks: [] },
    { id: 'b', title: 'B', due: '2026-01-05', done: false, subtasks: [] },
    { id: 'c', title: 'C', due: null, done: false, subtasks: [] },
    { id: 'd', title: 'D', due: '2026-02-20', done: false, subtasks: [] },
  ];

  test('orders tasks with a due date earliest‑first', () => {
    expect(sortTasksByDue(due).map((t) => t.id)).toEqual(['b', 'd', 'a', 'c']);
  });

  test('moves tasks without a due date to the end, keeping their order', () => {
    const list = [
      { id: 'x', title: 'X', due: null, done: false, subtasks: [] },
      { id: 'y', title: 'Y', due: '2026-01-01', done: false, subtasks: [] },
      { id: 'z', title: 'Z', due: null, done: false, subtasks: [] },
    ];
    expect(sortTasksByDue(list).map((t) => t.id)).toEqual(['y', 'x', 'z']);
  });

  test('keeps a stable order for equal or missing due dates', () => {
    const list = [
      { id: 'p', title: 'P', due: '2026-05-05', done: false, subtasks: [] },
      { id: 'q', title: 'Q', due: null, done: false, subtasks: [] },
      { id: 'r', title: 'R', due: '2026-05-05', done: false, subtasks: [] },
    ];
    // Equal due dates keep their original relative order; the undated
    // task ends up last.
    expect(sortTasksByDue(list).map((t) => t.id)).toEqual(['p', 'r', 'q']);
  });

  test('does not modify the input array', () => {
    const before = due.map((t) => t.id);
    sortTasksByDue(due);
    expect(due.map((t) => t.id)).toEqual(before);
  });

  test('returns an empty list for an empty input', () => {
    expect(sortTasksByDue([])).toEqual([]);
  });
});
