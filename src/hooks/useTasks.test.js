import { renderHook, act } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import {
  STORAGE_KEY,
  normalizeTasks,
  tasksReducer,
  useTasks,
} from './useTasks.js';

/**
 * Unit tests for the task state owned by `useTasks`. They exercise the hook
 * API (and the reducer behind it) without rendering the app UI, which keeps
 * them fast while the integration tests in App.test.jsx cover the full UI.
 */
describe('useTasks', () => {
  test('starts with an empty task list', () => {
    const { result } = renderHook(() => useTasks());
    expect(result.current.tasks).toEqual([]);
  });

  test('loads persisted tasks on the very first render (no hydration flash)', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ id: 'stored-1', title: 'Stored task', done: true }]),
    );
    const { result } = renderHook(() => useTasks());
    // The lazy initializer runs synchronously during the first render, so the
    // stored list is already visible without any state update.
    expect(result.current.tasks).toEqual([
      {
        id: 'stored-1',
        title: 'Stored task',
        description: '',
        done: true,
        subtasks: [],
      },
    ]);
  });

  test('falls back to an empty list when the stored value is corrupt', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const { result } = renderHook(() => useTasks());
      expect(result.current.tasks).toEqual([]);
    } finally {
      errorSpy.mockRestore();
    }
  });

  test('hydrates from the value written by another tab', () => {
    const { result } = renderHook(() => useTasks());
    expect(result.current.tasks).toHaveLength(0);
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: STORAGE_KEY,
          newValue: JSON.stringify([
            { id: 'other-1', title: 'From other tab' },
          ]),
        }),
      );
    });
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].title).toBe('From other tab');
  });

  test('ignores storage events for other keys', () => {
    const { result } = renderHook(() => useTasks());
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'something-else',
          newValue: JSON.stringify([{ id: 'x', title: 'Not for us' }]),
        }),
      );
    });
    expect(result.current.tasks).toHaveLength(0);
  });

  test('reports persistFailed when a storage write throws', () => {
    const { result } = renderHook(() => useTasks());
    expect(result.current.persistFailed).toBe(false);
    // Break storage after the initial (successful) write.
    const setItemSpy = vi
      .spyOn(globalThis.localStorage, 'setItem')
      .mockImplementation(() => {
        throw new Error('quota exceeded');
      });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      act(() => {
        result.current.addTask('Task A', '');
      });
      expect(result.current.persistFailed).toBe(true);
    } finally {
      setItemSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  test('clears persistFailed once a write succeeds again', () => {
    const { result } = renderHook(() => useTasks());
    expect(result.current.persistFailed).toBe(false);
    const setItemSpy = vi
      .spyOn(globalThis.localStorage, 'setItem')
      .mockImplementation(() => {
        throw new Error('quota exceeded');
      });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      act(() => {
        result.current.addTask('Task A', '');
      });
      expect(result.current.persistFailed).toBe(true);
      setItemSpy.mockRestore();
      act(() => {
        result.current.toggleTask(result.current.tasks[0].id);
      });
      expect(result.current.persistFailed).toBe(false);
    } finally {
      setItemSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  test('generates ids even when crypto.randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {});
    try {
      const { result } = renderHook(() => useTasks());
      act(() => {
        result.current.addTask('Task A', '');
      });
      expect(typeof result.current.tasks[0].id).toBe('string');
      expect(result.current.tasks[0].id.length).toBeGreaterThan(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test('addTask appends a task with defaults and trimmed values', () => {
    const { result } = renderHook(() => useTasks());
    act(() => {
      result.current.addTask('  Buy milk  ', '  tomorrow  ');
    });
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0]).toMatchObject({
      title: 'Buy milk',
      description: 'tomorrow',
      done: false,
      subtasks: [],
    });
  });

  test('toggleTask flips done only for the matching id', () => {
    const { result } = renderHook(() => useTasks());
    act(() => {
      result.current.addTask('Task A', '');
      result.current.addTask('Task B', '');
    });
    const [firstTask] = result.current.tasks;
    act(() => {
      result.current.toggleTask(firstTask.id);
    });
    expect(result.current.tasks[0].done).toBe(true);
    expect(result.current.tasks[1].done).toBe(false);
  });

  test('deleteTask removes the matching task', () => {
    const { result } = renderHook(() => useTasks());
    act(() => {
      result.current.addTask('Task A', '');
      result.current.addTask('Task B', '');
    });
    const [firstTask] = result.current.tasks;
    act(() => {
      result.current.deleteTask(firstTask.id);
    });
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].title).toBe('Task B');
  });

  test('editTask updates the trimmed title and description', () => {
    const { result } = renderHook(() => useTasks());
    act(() => {
      result.current.addTask('Task A', 'old description');
    });
    const [firstTask] = result.current.tasks;
    act(() => {
      result.current.editTask(firstTask.id, {
        title: '  New title  ',
        description: '  New description  ',
      });
    });
    expect(result.current.tasks[0]).toMatchObject({
      title: 'New title',
      description: 'New description',
    });
  });

  test('addSubtask adds to the right parent and returns the new id', () => {
    const { result } = renderHook(() => useTasks());
    act(() => {
      result.current.addTask('Parent A', '');
      result.current.addTask('Parent B', '');
    });
    const [parentA] = result.current.tasks;
    let newSubId;
    act(() => {
      newSubId = result.current.addSubtask(parentA.id, {
        title: 'Sub 1',
        description: 'Sub description',
      });
    });
    expect(result.current.tasks[0].subtasks).toHaveLength(1);
    expect(result.current.tasks[0].subtasks[0]).toMatchObject({
      id: newSubId,
      title: 'Sub 1',
      done: false,
    });
    // The other parent must be untouched.
    expect(result.current.tasks[1].subtasks).toHaveLength(0);
  });

  test('toggleSubtask flips done only for the matching subtask', () => {
    const { result } = renderHook(() => useTasks());
    act(() => {
      result.current.addTask('Parent A', '');
    });
    const parentId = result.current.tasks[0].id;
    act(() => {
      result.current.addSubtask(parentId, { title: 'Sub 1', description: '' });
    });
    act(() => {
      result.current.addSubtask(parentId, { title: 'Sub 2', description: '' });
    });
    const [firstSub] = result.current.tasks[0].subtasks;
    act(() => {
      result.current.toggleSubtask(parentId, firstSub.id);
    });
    expect(result.current.tasks[0].subtasks[0].done).toBe(true);
    expect(result.current.tasks[0].subtasks[1].done).toBe(false);
  });

  test('deleteSubtask removes only the matching subtask', () => {
    const { result } = renderHook(() => useTasks());
    act(() => {
      result.current.addTask('Parent A', '');
    });
    const parentId = result.current.tasks[0].id;
    act(() => {
      result.current.addSubtask(parentId, { title: 'Sub 1', description: '' });
    });
    act(() => {
      result.current.addSubtask(parentId, { title: 'Sub 2', description: '' });
    });
    const [firstSub] = result.current.tasks[0].subtasks;
    act(() => {
      result.current.deleteSubtask(parentId, firstSub.id);
    });
    const subs = result.current.tasks[0].subtasks;
    expect(subs).toHaveLength(1);
    expect(subs[0].title).toBe('Sub 2');
  });

  test('editSubtask updates the trimmed title and description', () => {
    const { result } = renderHook(() => useTasks());
    act(() => {
      result.current.addTask('Parent A', '');
    });
    const parentId = result.current.tasks[0].id;
    act(() => {
      result.current.addSubtask(parentId, {
        title: 'Sub 1',
        description: 'old',
      });
    });
    const [firstSub] = result.current.tasks[0].subtasks;
    act(() => {
      result.current.editSubtask(parentId, firstSub.id, {
        title: '  Sub 1 edited  ',
        description: '  new  ',
      });
    });
    expect(result.current.tasks[0].subtasks[0]).toMatchObject({
      title: 'Sub 1 edited',
      description: 'new',
    });
  });

  test('clearCompleted removes only the completed tasks', () => {
    const { result } = renderHook(() => useTasks());
    act(() => {
      result.current.addTask('Task A', '');
      result.current.addTask('Task B', '');
    });
    const [firstTask] = result.current.tasks;
    act(() => {
      result.current.toggleTask(firstTask.id);
    });
    act(() => {
      result.current.clearCompleted();
    });
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].title).toBe('Task B');
  });
});

describe('tasksReducer', () => {
  test('ignores unknown actions and returns the state untouched', () => {
    const tasks = [{ id: 'a', title: 'A', done: false, subtasks: [] }];
    expect(tasksReducer(tasks, { type: 'unknown' })).toBe(tasks);
  });
});

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
      { id: 't1', title: 'Task', description: '', done: true, subtasks: [] },
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
