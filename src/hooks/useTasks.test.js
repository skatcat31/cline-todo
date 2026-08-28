import { renderHook, act } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
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
});

describe('tasksReducer', () => {
  test('ignores unknown actions and returns the state untouched', () => {
    const tasks = [{ id: 'a', title: 'A', done: false, subtasks: [] }];
    expect(tasksReducer(tasks, { type: 'unknown' })).toBe(tasks);
  });
});
