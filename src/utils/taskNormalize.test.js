import { describe, expect, test } from 'vitest';
import { normalizeList, normalizeTasks } from './taskNormalize.js';

/**
 * Unit tests for the task/list normalization shared by the state hook
 * (hooks/useTasks.js) and the file helpers (utils/taskFile.js).
 */
describe('normalizeTasks', () => {
  test('returns an empty list for non-array input', () => {
    expect(normalizeTasks(null)).toEqual([]);
    expect(normalizeTasks('nope')).toEqual([]);
    expect(normalizeTasks({ tasks: [] })).toEqual([]);
  });

  test('drops entries that are not task-shaped and coerces the rest', () => {
    const normalized = normalizeTasks([
      'garbage',
      null,
      { id: 42, title: 7 },
      { id: 't1', title: 'Task', done: 'yes', subtasks: 'nope' },
    ]);
    expect(normalized).toEqual([
      {
        id: 't1',
        title: 'Task',
        description: '',
        due: null,
        done: true,
        subtasks: [],
      },
    ]);
  });

  test('keeps a valid due date and drops an invalid one', () => {
    const normalized = normalizeTasks([
      { id: 'a', title: 'Valid', due: '2026-09-10' },
      { id: 'b', title: 'Impossible date', due: '2026-02-30' },
      { id: 'c', title: 'Wrong shape', due: 42 },
      { id: 'd', title: 'No due' },
    ]);
    expect(normalized.map((task) => task.due)).toEqual([
      '2026-09-10',
      null,
      null,
      null,
    ]);
  });

  test('keeps valid subtasks and drops the invalid ones', () => {
    const normalized = normalizeTasks([
      {
        id: 't1',
        title: 'Task',
        description: 'desc',
        done: false,
        subtasks: [
          { id: 's1', title: 'Sub', description: null, done: 1 },
          'junk',
        ],
      },
    ]);
    expect(normalized[0].subtasks).toEqual([
      { id: 's1', title: 'Sub', description: '', done: true },
    ]);
  });
});

describe('normalizeList', () => {
  test('keeps a usable id and name, normalizes the tasks', () => {
    expect(
      normalizeList(
        { id: 'l1', name: 'Work', tasks: [{ id: 'a', title: 'A' }] },
        0,
      ),
    ).toEqual({
      id: 'l1',
      name: 'Work',
      tasks: [
        {
          id: 'a',
          title: 'A',
          description: '',
          due: null,
          done: false,
          subtasks: [],
        },
      ],
    });
  });

  test('generates an id and the default name for unusable entries', () => {
    expect(normalizeList(null, 3)).toEqual({
      id: 'list-3',
      name: 'To-Do',
      tasks: [],
    });
    expect(normalizeList({ id: 42, name: '   ' }, 1)).toEqual({
      id: 'list-1',
      name: 'To-Do',
      tasks: [],
    });
  });
});
