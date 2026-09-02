import { act, renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { useTaskImport } from './useTaskImport.js';

// The imported tasks (the shape the app exports; normalization fills in
// any missing fields).
const imported = [
  {
    id: 'i1',
    title: 'Imported',
    description: '',
    due: null,
    done: false,
    subtasks: [],
  },
];
const existing = [
  {
    id: 'e1',
    title: 'Existing',
    description: '',
    due: null,
    done: false,
    subtasks: [],
  },
];

// A File‑like stand‑in whose `text()` resolves with the given contents.
const fileWith = (text) => ({
  name: 'todo.json',
  size: text.length,
  text: async () => text,
});

// The event shape the input's onChange handler expects.
const fileChangeEvent = (file) => ({
  target: {
    files: file ? [file] : [],
    value: file ? 'C:\\fakepath\\todo.json' : '',
  },
});

describe('useTaskImport', () => {
  test('a valid import into an empty list replaces it without confirming', async () => {
    const replaceTasks = vi.fn();
    const { result } = renderHook(() => useTaskImport([], replaceTasks));
    await act(async () => {
      await result.current.handleFileChange(
        fileChangeEvent(fileWith(JSON.stringify(imported))),
      );
    });
    expect(replaceTasks).toHaveBeenCalledWith(imported);
    expect(result.current.pendingImport).toBeNull();
    expect(result.current.error).toBe(false);
  });

  test('a valid import into a non‑empty list waits for the user’s decision', async () => {
    const replaceTasks = vi.fn();
    const { result } = renderHook(() => useTaskImport(existing, replaceTasks));
    await act(async () => {
      await result.current.handleFileChange(
        fileChangeEvent(fileWith(JSON.stringify(imported))),
      );
    });
    expect(replaceTasks).not.toHaveBeenCalled();
    expect(result.current.pendingImport).toEqual(imported);
  });

  test('merging keeps the current tasks and appends the imported ones', async () => {
    const replaceTasks = vi.fn();
    const { result } = renderHook(() => useTaskImport(existing, replaceTasks));
    await act(async () => {
      await result.current.handleFileChange(
        fileChangeEvent(fileWith(JSON.stringify(imported))),
      );
    });
    act(() => {
      result.current.merge();
    });
    expect(replaceTasks).toHaveBeenCalledWith([...existing, ...imported]);
    expect(result.current.pendingImport).toBeNull();
  });

  test('replacing swaps the list for the imported tasks', async () => {
    const replaceTasks = vi.fn();
    const { result } = renderHook(() => useTaskImport(existing, replaceTasks));
    await act(async () => {
      await result.current.handleFileChange(
        fileChangeEvent(fileWith(JSON.stringify(imported))),
      );
    });
    act(() => {
      result.current.replace();
    });
    expect(replaceTasks).toHaveBeenCalledWith(imported);
    expect(result.current.pendingImport).toBeNull();
    // The decision is single‑use: repeating it is a no‑op.
    act(() => {
      result.current.replace();
    });
    expect(replaceTasks).toHaveBeenCalledTimes(1);
  });

  test('cancelling closes the decision without importing', async () => {
    const replaceTasks = vi.fn();
    const { result } = renderHook(() => useTaskImport(existing, replaceTasks));
    await act(async () => {
      await result.current.handleFileChange(
        fileChangeEvent(fileWith(JSON.stringify(imported))),
      );
    });
    act(() => {
      result.current.cancel();
    });
    expect(result.current.pendingImport).toBeNull();
    expect(replaceTasks).not.toHaveBeenCalled();
  });

  test('an invalid file sets the error and leaves the list untouched', async () => {
    const replaceTasks = vi.fn();
    const { result } = renderHook(() => useTaskImport(existing, replaceTasks));
    await act(async () => {
      await result.current.handleFileChange(
        fileChangeEvent(fileWith('this is not a task list')),
      );
    });
    expect(result.current.error).toBe(true);
    expect(result.current.pendingImport).toBeNull();
    expect(replaceTasks).not.toHaveBeenCalled();
    // A valid import afterwards clears the error.
    await act(async () => {
      await result.current.handleFileChange(
        fileChangeEvent(fileWith(JSON.stringify(imported))),
      );
    });
    expect(result.current.error).toBe(false);
    expect(result.current.pendingImport).toEqual(imported);
  });

  test('valid JSON that is not a task array is rejected', async () => {
    const replaceTasks = vi.fn();
    const { result } = renderHook(() => useTaskImport(existing, replaceTasks));
    await act(async () => {
      await result.current.handleFileChange(
        fileChangeEvent(fileWith(JSON.stringify({ tasks: imported }))),
      );
    });
    expect(result.current.error).toBe(true);
    expect(replaceTasks).not.toHaveBeenCalled();
  });

  test('a missing file is ignored', async () => {
    const replaceTasks = vi.fn();
    const { result } = renderHook(() => useTaskImport(existing, replaceTasks));
    await act(async () => {
      await result.current.handleFileChange(fileChangeEvent(null));
    });
    expect(result.current.error).toBe(false);
    expect(result.current.pendingImport).toBeNull();
    expect(replaceTasks).not.toHaveBeenCalled();
  });

  test('resets the input value so the same file can be imported again', async () => {
    const input = {
      files: [fileWith(JSON.stringify(imported))],
      value: 'C:\\fakepath\\todo.json',
    };
    const { result } = renderHook(() => useTaskImport([], vi.fn()));
    await act(async () => {
      await result.current.handleFileChange({ target: input });
    });
    expect(input.value).toBe('');
  });
});
