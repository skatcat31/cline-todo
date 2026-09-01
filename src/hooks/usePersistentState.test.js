import { renderHook, act } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { usePersistentState } from './usePersistentState.js';

/**
 * Unit tests for usePersistentState: a useState whose value is mirrored into
 * localStorage (best effort). The app uses it for the filter and the theme.
 */
test('starts with the value computed by the lazy initializer', () => {
  const getInitialState = vi.fn(() => 'completed');
  const { result } = renderHook(() => usePersistentState('k', getInitialState));
  expect(getInitialState).toHaveBeenCalledTimes(1);
  expect(result.current[0]).toBe('completed');
});

test('does not re‑write the initial value, but mirrors updates into localStorage', () => {
  const { result } = renderHook(() =>
    usePersistentState('my-key', () => 'light'),
  );
  // The initial value was just loaded – writing it back would only
  // duplicate what storage already holds, so nothing is written yet.
  expect(localStorage.getItem('my-key')).toBeNull();
  act(() => {
    result.current[1]('dark');
  });
  expect(result.current[0]).toBe('dark');
  expect(localStorage.getItem('my-key')).toBe('dark');
});

test('swallows failing writes so storage-unavailable browsers stay usable', () => {
  // The test setup polyfills localStorage as a plain object, so the spy is
  // installed on the instance (and catches the write of the update).
  const setItemSpy = vi
    .spyOn(window.localStorage, 'setItem')
    .mockImplementation(() => {
      throw new Error('storage unavailable');
    });
  const { result } = renderHook(() =>
    usePersistentState('my-key', () => 'light'),
  );
  expect(() => {
    act(() => {
      result.current[1]('dark');
    });
  }).not.toThrow();
  // The value still updates in memory: the update was attempted (and
  // swallowed) – the initial value is not written at all.
  expect(result.current[0]).toBe('dark');
  expect(setItemSpy).toHaveBeenCalledTimes(1);
  expect(setItemSpy.mock.calls.at(-1)).toEqual(['my-key', 'dark']);
  setItemSpy.mockRestore();
});
