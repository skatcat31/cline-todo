import { act, renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { UNDO_LIMIT, useUndoStack } from './useUndoStack.js';

// One removed task with its remembered position (the shape the app pushes
// for single deletes).
const removed = (id) => [{ task: { id, title: `Task ${id}` }, index: 0 }];

describe('useUndoStack', () => {
  test('starts empty', () => {
    const { result } = renderHook(() => useUndoStack(vi.fn()));
    expect(result.current.stack).toEqual([]);
  });

  test('push remembers the entries (oldest first) with increasing stamps', () => {
    const { result } = renderHook(() => useUndoStack(vi.fn()));
    act(() => {
      result.current.push(removed('a'), 'list-1');
      result.current.push(removed('b'), 'list-2');
    });
    expect(result.current.stack).toEqual([
      { items: removed('a'), listId: 'list-1', stamp: 1 },
      { items: removed('b'), listId: 'list-2', stamp: 2 },
    ]);
  });

  test('keeps only the most recent entries, dropping the oldest', () => {
    const { result } = renderHook(() => useUndoStack(vi.fn()));
    act(() => {
      for (let i = 1; i <= UNDO_LIMIT + 2; i += 1) {
        result.current.push(removed(`t${i}`), `list-${i}`);
      }
    });
    expect(result.current.stack).toHaveLength(UNDO_LIMIT);
    expect(result.current.stack.map((entry) => entry.listId)).toEqual([
      'list-3',
      'list-4',
      'list-5',
      'list-6',
      'list-7',
    ]);
  });

  test('undo re‑inserts the newest entry and keeps the earlier ones', () => {
    const apply = vi.fn();
    const { result } = renderHook(() => useUndoStack(apply));
    act(() => {
      result.current.push(removed('a'), 'list-1');
      result.current.push(removed('b'), 'list-2');
    });
    // The most recent entry goes first…
    act(() => {
      result.current.undo();
    });
    expect(apply).toHaveBeenCalledWith(removed('b'), 'list-2');
    expect(result.current.stack).toHaveLength(1);
    // …then the previous one, until the stack is empty.
    act(() => {
      result.current.undo();
    });
    expect(apply).toHaveBeenLastCalledWith(removed('a'), 'list-1');
    expect(result.current.stack).toHaveLength(0);
    // Undoing with an empty stack is a no‑op.
    act(() => {
      result.current.undo();
    });
    expect(apply).toHaveBeenCalledTimes(2);
  });

  test('timeout drops only the newest entry, clickaway keeps the stack, anything else clears it', () => {
    const { result } = renderHook(() => useUndoStack(vi.fn()));
    act(() => {
      result.current.push(removed('a'), 'list-1');
      result.current.push(removed('b'), 'list-2');
    });
    // The auto‑hide expired: only the newest entry is dropped, so the
    // previous undo gets its own window.
    act(() => {
      result.current.close({}, 'timeout');
    });
    expect(result.current.stack).toHaveLength(1);
    expect(result.current.stack[0].listId).toBe('list-1');
    // A clickaway (clicking elsewhere) keeps the stack as is.
    act(() => {
      result.current.close({}, 'clickaway');
    });
    expect(result.current.stack).toHaveLength(1);
    // An explicit dismiss (the close button / Escape) clears the stack.
    act(() => {
      result.current.close({}, 'closebutton');
    });
    expect(result.current.stack).toHaveLength(0);
  });
});
