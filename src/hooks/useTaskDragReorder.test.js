import { act, renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { useTaskDragReorder } from './useTaskDragReorder.js';

describe('useTaskDragReorder', () => {
  test('starts with no drag in progress', () => {
    const { result } = renderHook(() => useTaskDragReorder(vi.fn()));
    expect(result.current.dragTask).toBeNull();
  });

  test('start remembers the dragged task', () => {
    const { result } = renderHook(() => useTaskDragReorder(vi.fn()));
    act(() => {
      result.current.start('t1');
    });
    expect(result.current.dragTask).toEqual({
      id: 't1',
      overId: null,
      after: false,
    });
  });

  test('over updates the hover target and skips unchanged repetitions', () => {
    const { result } = renderHook(() => useTaskDragReorder(vi.fn()));
    act(() => {
      result.current.start('t1');
    });
    // Hovering the dragged task's own row is ignored…
    act(() => {
      result.current.over('t1', true);
    });
    expect(result.current.dragTask.overId).toBeNull();
    // …hovering another row is remembered (with which half of it)…
    act(() => {
      result.current.over('t2', false);
    });
    expect(result.current.dragTask).toEqual({
      id: 't1',
      overId: 't2',
      after: false,
    });
    // …and reporting the same hover again is a no‑op (the very same state
    // object is kept, so the list does not re‑render).
    const before = result.current.dragTask;
    act(() => {
      result.current.over('t2', false);
    });
    expect(result.current.dragTask).toBe(before);
  });

  test('drop moves the dragged task before/after the target row and ends the drag', () => {
    const reorder = vi.fn();
    const { result } = renderHook(() => useTaskDragReorder(reorder));
    act(() => {
      result.current.start('t1');
    });
    act(() => {
      result.current.drop('t2', true);
    });
    expect(reorder).toHaveBeenCalledWith('t1', 't2', true);
    expect(result.current.dragTask).toBeNull();
  });

  test('dropping the task onto itself, or with no drag in progress, does nothing', () => {
    const reorder = vi.fn();
    const { result } = renderHook(() => useTaskDragReorder(reorder));
    act(() => {
      result.current.start('t1');
      result.current.drop('t1', false);
    });
    expect(reorder).not.toHaveBeenCalled();
    act(() => {
      result.current.drop('t2', false);
    });
    expect(reorder).not.toHaveBeenCalled();
    expect(result.current.dragTask).toBeNull();
  });

  test('end clears the drag (drop or cancel)', () => {
    const { result } = renderHook(() => useTaskDragReorder(vi.fn()));
    act(() => {
      result.current.start('t1');
    });
    act(() => {
      result.current.end();
    });
    expect(result.current.dragTask).toBeNull();
  });
});
