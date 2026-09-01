import { renderHook, act } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { STORAGE_KEY, STORAGE_VERSION } from '../utils/taskPayload.js';
import { tasksReducer, useTasks } from './useTasks.js';

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
        due: null,
        done: true,
        subtasks: [],
      },
    ]);
  });

  test('loads a versioned payload ({version, tasks}) from storage', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: STORAGE_VERSION,
        tasks: [{ id: 'stored-1', title: 'Stored task', done: false }],
      }),
    );
    const { result } = renderHook(() => useTasks());
    expect(result.current.tasks).toEqual([
      {
        id: 'stored-1',
        title: 'Stored task',
        description: '',
        due: null,
        done: false,
        subtasks: [],
      },
    ]);
  });

  test('persists the list as a versioned payload', () => {
    const { result } = renderHook(() => useTasks());
    act(() => {
      result.current.addTask('Task A', '');
    });
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.version).toBe(STORAGE_VERSION);
    expect(stored.activeListId).toBe('default');
    expect(stored.lists).toHaveLength(1);
    expect(stored.lists[0].name).toBe('To-Do');
    expect(stored.lists[0].tasks).toHaveLength(1);
    expect(stored.lists[0].tasks[0]).toMatchObject({
      title: 'Task A',
      done: false,
    });
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

  test('addTask stores a valid due date and normalises invalid ones to null', () => {
    const { result } = renderHook(() => useTasks());
    act(() => {
      result.current.addTask('With due', '', '2026-09-10');
      result.current.addTask('Bad due', '', 'not a date');
      result.current.addTask('No due', '');
    });
    expect(result.current.tasks[0].due).toBe('2026-09-10');
    expect(result.current.tasks[1].due).toBeNull();
    expect(result.current.tasks[2].due).toBeNull();
  });

  test('editTask updates the due date (including clearing it)', () => {
    const { result } = renderHook(() => useTasks());
    act(() => {
      result.current.addTask('Task A', '', '2026-09-10');
    });
    const [firstTask] = result.current.tasks;
    act(() => {
      result.current.editTask(firstTask.id, {
        title: 'Task A',
        description: '',
        due: '2026-10-01',
      });
    });
    expect(result.current.tasks[0].due).toBe('2026-10-01');
    act(() => {
      result.current.editTask(firstTask.id, {
        title: 'Task A',
        description: '',
        due: null,
      });
    });
    expect(result.current.tasks[0].due).toBeNull();
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

  test('moveTask swaps a task with its neighbour', () => {
    const { result } = renderHook(() => useTasks());
    let taskA;
    let taskB;
    act(() => {
      result.current.addTask('Task A', '');
      result.current.addTask('Task B', '');
    });
    [taskA, taskB] = result.current.tasks;
    act(() => {
      result.current.moveTask(taskA.id, taskB.id);
    });
    expect(result.current.tasks.map((t) => t.title)).toEqual([
      'Task B',
      'Task A',
    ]);
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

  test('insertTasks re‑adds removed tasks at their positions', () => {
    const { result } = renderHook(() => useTasks());
    let taskA;
    let taskB;
    act(() => {
      result.current.addTask('Task A', '');
      result.current.addTask('Task B', '');
      result.current.addTask('Task C', '');
    });
    [taskA, taskB] = result.current.tasks;
    act(() => {
      result.current.deleteTask(taskA.id);
      result.current.deleteTask(taskB.id);
    });
    expect(result.current.tasks.map((t) => t.title)).toEqual(['Task C']);
    act(() => {
      result.current.insertTasks([
        { task: taskA, index: 0 },
        { task: taskB, index: 1 },
      ]);
    });
    expect(result.current.tasks.map((t) => t.title)).toEqual([
      'Task A',
      'Task B',
      'Task C',
    ]);
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

  test('reorderTask moves a task relative to another one', () => {
    const { result } = renderHook(() => useTasks());
    act(() => {
      result.current.addTask('Task A', '');
      result.current.addTask('Task B', '');
      result.current.addTask('Task C', '');
    });
    const ids = result.current.tasks.map((t) => t.id);
    act(() => {
      result.current.reorderTask(ids[0], ids[2], true);
    });
    expect(result.current.tasks.map((t) => t.title)).toEqual([
      'Task B',
      'Task C',
      'Task A',
    ]);
  });
});

test('addList, renameList, selectList and deleteList manage the lists', () => {
  const { result } = renderHook(() => useTasks());
  act(() => {
    result.current.addTask('In first list', '');
  });
  act(() => {
    result.current.addList('Second');
  });
  expect(result.current.lists).toHaveLength(2);
  // The new list becomes active and starts out empty.
  expect(result.current.activeListId).toBe(result.current.lists[1].id);
  expect(result.current.lists[1].name).toBe('Second');
  expect(result.current.tasks).toEqual([]);

  act(() => {
    result.current.addTask('In second list', '');
  });
  act(() => {
    result.current.selectList(result.current.lists[0].id);
  });
  // Each list keeps its own tasks.
  expect(result.current.tasks.map((t) => t.title)).toEqual(['In first list']);

  act(() => {
    result.current.renameList(result.current.lists[1].id, 'Renamed');
  });
  expect(result.current.lists[1].name).toBe('Renamed');

  act(() => {
    result.current.deleteList(result.current.lists[1].id);
  });
  expect(result.current.lists).toHaveLength(1);
  expect(result.current.lists[0].name).toBe('To-Do');
  // The remaining (first) list stays active.
  expect(result.current.tasks.map((t) => t.title)).toEqual(['In first list']);
});

describe('tasksReducer', () => {
  // Build a reducer state whose single list holds the given tasks.
  const stateWith = (tasks, listId = 'l1') => ({
    lists: [{ id: listId, name: 'To-Do', tasks }],
    activeListId: listId,
  });
  const taskIds = (state) => state.lists[0].tasks.map((t) => t.id);

  test('ignores unknown actions and returns the state untouched', () => {
    const state = stateWith([
      { id: 'a', title: 'A', done: false, subtasks: [] },
    ]);
    expect(tasksReducer(state, { type: 'unknown' })).toBe(state);
  });

  test('insert-tasks places the tasks at the given indices without mutating', () => {
    const existing = stateWith([
      { id: 'a', title: 'A', done: false, subtasks: [] },
      { id: 'b', title: 'B', done: false, subtasks: [] },
    ]);
    const x = { id: 'x', title: 'X', done: false, subtasks: [] };
    const y = { id: 'y', title: 'Y', done: false, subtasks: [] };
    const after = tasksReducer(existing, {
      type: 'insert-tasks',
      listId: 'l1',
      items: [
        { task: x, index: 0 },
        { task: y, index: 3 },
      ],
    });
    expect(taskIds(after)).toEqual(['x', 'a', 'b', 'y']);
    // The previous state must not have been mutated.
    expect(existing.lists[0].tasks.map((t) => t.id)).toEqual(['a', 'b']);
  });

  test('insert-tasks clamps out-of-range indices instead of corrupting', () => {
    const existing = stateWith([
      { id: 'a', title: 'A', done: false, subtasks: [] },
      { id: 'b', title: 'B', done: false, subtasks: [] },
    ]);
    const x = { id: 'x', title: 'X', done: false, subtasks: [] };
    expect(
      taskIds(
        tasksReducer(existing, {
          type: 'insert-tasks',
          listId: 'l1',
          items: [{ task: x, index: 99 }],
        }),
      ),
    ).toEqual(['a', 'b', 'x']);
    expect(
      taskIds(
        tasksReducer(existing, {
          type: 'insert-tasks',
          listId: 'l1',
          items: [{ task: x, index: -3 }],
        }),
      ),
    ).toEqual(['x', 'a', 'b']);
  });

  test('insert-tasks skips malformed items and ids that already exist', () => {
    const existing = stateWith([
      { id: 'a', title: 'A', done: false, subtasks: [] },
    ]);
    const after = tasksReducer(existing, {
      type: 'insert-tasks',
      listId: 'l1',
      items: [
        // Malformed: the remembered task object is gone (stale undo entry).
        { task: undefined, index: 0 },
        // Not an object at all.
        { task: 'garbage', index: 0 },
        // Already present in the target list (another tab re‑added it).
        {
          task: { id: 'a', title: 'Duplicate', done: false, subtasks: [] },
          index: 0,
        },
        // The only usable item.
        { task: { id: 'x', title: 'X', done: false, subtasks: [] }, index: 0 },
      ],
    });
    expect(taskIds(after)).toEqual(['x', 'a']);
  });

  test('insert-tasks leaves the state untouched when nothing is usable', () => {
    const existing = stateWith([
      { id: 'a', title: 'A', done: false, subtasks: [] },
    ]);
    const after = tasksReducer(existing, {
      type: 'insert-tasks',
      listId: 'l1',
      items: [
        { task: undefined, index: 0 },
        {
          task: { id: 'a', title: 'Duplicate', done: false, subtasks: [] },
          index: 0,
        },
      ],
    });
    expect(after).toBe(existing);
  });

  test('insert-tasks targets the given list and leaves the others alone', () => {
    const state = {
      lists: [
        {
          id: 'l1',
          name: 'First',
          tasks: [{ id: 'a', title: 'A', done: false, subtasks: [] }],
        },
        {
          id: 'l2',
          name: 'Second',
          tasks: [{ id: 'b', title: 'B', done: false, subtasks: [] }],
        },
      ],
      activeListId: 'l1',
    };
    const x = { id: 'x', title: 'X', done: false, subtasks: [] };
    const after = tasksReducer(state, {
      type: 'insert-tasks',
      listId: 'l2',
      items: [{ task: x, index: 0 }],
    });
    expect(after.lists[0].tasks.map((t) => t.id)).toEqual(['a']);
    expect(after.lists[1].tasks.map((t) => t.id)).toEqual(['x', 'b']);
  });

  test('insert-tasks for a missing list falls back to the active one', () => {
    const state = stateWith([
      { id: 'a', title: 'A', done: false, subtasks: [] },
    ]);
    const x = { id: 'x', title: 'X', done: false, subtasks: [] };
    const after = tasksReducer(state, {
      type: 'insert-tasks',
      listId: 'gone',
      items: [{ task: x, index: 0 }],
    });
    expect(taskIds(after)).toEqual(['x', 'a']);
  });

  test('move-task swaps the two tasks without mutating the state', () => {
    const state = stateWith([
      { id: 'a', title: 'A', done: false, subtasks: [] },
      { id: 'b', title: 'B', done: false, subtasks: [] },
      { id: 'c', title: 'C', done: false, subtasks: [] },
    ]);
    const after = tasksReducer(state, {
      type: 'move-task',
      id: 'a',
      swapId: 'b',
    });
    expect(taskIds(after)).toEqual(['b', 'a', 'c']);
    // The previous state must not have been mutated.
    expect(state.lists[0].tasks.map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });

  test('move-task leaves the state untouched for unknown or identical ids', () => {
    const state = stateWith([
      { id: 'a', title: 'A', done: false, subtasks: [] },
      { id: 'b', title: 'B', done: false, subtasks: [] },
    ]);
    expect(
      tasksReducer(state, { type: 'move-task', id: 'nope', swapId: 'b' }),
    ).toBe(state);
    expect(
      tasksReducer(state, { type: 'move-task', id: 'a', swapId: 'nope' }),
    ).toBe(state);
    expect(
      tasksReducer(state, { type: 'move-task', id: 'a', swapId: 'a' }),
    ).toBe(state);
  });

  test('reorder-task moves a task before/after the target without mutating', () => {
    const state = stateWith([
      { id: 'a', title: 'A', done: false, subtasks: [] },
      { id: 'b', title: 'B', done: false, subtasks: [] },
      { id: 'c', title: 'C', done: false, subtasks: [] },
      { id: 'd', title: 'D', done: false, subtasks: [] },
    ]);
    // Moving a task down: drop 'a' into the lower half of 'c'.
    expect(
      taskIds(
        tasksReducer(state, {
          type: 'reorder-task',
          id: 'a',
          targetId: 'c',
          after: true,
        }),
      ),
    ).toEqual(['b', 'c', 'a', 'd']);
    // Moving a task up: drop 'd' into the upper half of 'b' - it lands
    // directly before b.
    expect(
      taskIds(
        tasksReducer(state, {
          type: 'reorder-task',
          id: 'd',
          targetId: 'b',
          after: false,
        }),
      ),
    ).toEqual(['a', 'd', 'b', 'c']);
    // The previous state must not have been mutated.
    expect(state.lists[0].tasks.map((t) => t.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  test('reorder-task leaves the state untouched for unknown or identical ids', () => {
    const state = stateWith([
      { id: 'a', title: 'A', done: false, subtasks: [] },
      { id: 'b', title: 'B', done: false, subtasks: [] },
    ]);
    expect(
      tasksReducer(state, {
        type: 'reorder-task',
        id: 'a',
        targetId: 'a',
        after: true,
      }),
    ).toBe(state);
    expect(
      tasksReducer(state, {
        type: 'reorder-task',
        id: 'nope',
        targetId: 'b',
        after: false,
      }),
    ).toBe(state);
    expect(
      tasksReducer(state, {
        type: 'reorder-task',
        id: 'a',
        targetId: 'nope',
        after: false,
      }),
    ).toBe(state);
  });

  // ---- list-level actions ---------------------------------------------
  test('add-list appends a new empty list and makes it active', () => {
    const state = stateWith([]);
    const after = tasksReducer(state, { type: 'add-list', name: 'Work' });
    expect(after.lists).toHaveLength(2);
    expect(after.lists[1].name).toBe('Work');
    expect(after.lists[1].tasks).toEqual([]);
    expect(after.activeListId).toBe(after.lists[1].id);
    expect(after.lists[0]).toBe(state.lists[0]);
  });

  test('rename-list changes only the name of the given list', () => {
    const state = stateWith([
      { id: 'a', title: 'A', done: false, subtasks: [] },
    ]);
    const after = tasksReducer(state, {
      type: 'rename-list',
      id: 'l1',
      name: 'Work',
    });
    expect(after.lists[0].name).toBe('Work');
    // The task array reference is preserved.
    expect(after.lists[0].tasks).toBe(state.lists[0].tasks);
  });

  test('rename-list leaves the state untouched for an unknown id', () => {
    const state = stateWith([]);
    expect(
      tasksReducer(state, { type: 'rename-list', id: 'nope', name: 'X' }),
    ).toBe(state);
  });

  test('select-list switches the active list without touching its tasks', () => {
    const state = {
      lists: [
        { id: 'l1', name: 'First', tasks: [] },
        { id: 'l2', name: 'Second', tasks: [] },
      ],
      activeListId: 'l1',
    };
    const after = tasksReducer(state, { type: 'select-list', id: 'l2' });
    expect(after.activeListId).toBe('l2');
    expect(after.lists).toBe(state.lists);
  });

  test('select-list leaves the state untouched for an unknown id', () => {
    const state = stateWith([]);
    expect(tasksReducer(state, { type: 'select-list', id: 'nope' })).toBe(
      state,
    );
  });

  test('delete-list removes the list and falls back to the first one', () => {
    const state = {
      lists: [
        {
          id: 'l1',
          name: 'First',
          tasks: [{ id: 'a', title: 'A', done: false, subtasks: [] }],
        },
        {
          id: 'l2',
          name: 'Second',
          tasks: [{ id: 'b', title: 'B', done: false, subtasks: [] }],
        },
      ],
      activeListId: 'l2',
    };
    const after = tasksReducer(state, { type: 'delete-list', id: 'l2' });
    expect(after.lists).toHaveLength(1);
    expect(after.lists[0].id).toBe('l1');
    // The deleted list was the active one, so the active list falls back.
    expect(after.activeListId).toBe('l1');
  });

  test('delete-list keeps the active list when another one is removed', () => {
    const state = {
      lists: [
        { id: 'l1', name: 'First', tasks: [] },
        { id: 'l2', name: 'Second', tasks: [] },
      ],
      activeListId: 'l1',
    };
    const after = tasksReducer(state, { type: 'delete-list', id: 'l2' });
    expect(after.lists).toHaveLength(1);
    expect(after.activeListId).toBe('l1');
  });

  test('delete-list keeps a single list (there is nothing to fall back to)', () => {
    const state = stateWith([]);
    expect(tasksReducer(state, { type: 'delete-list', id: 'l1' })).toBe(state);
  });
});
