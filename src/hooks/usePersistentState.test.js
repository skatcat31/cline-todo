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

test('updates the value and mirrors it into localStorage', () => {
  const { result } = renderHook(() =>
    usePersistentState('my-key', () => 'light'),
  );
  expect(localStorage.getItem('my-key')).toBe('light');
  act(() => {
    result.current[1]('dark');
  });
  expect(result.current[0]).toBe('dark');
  expect(localStorage.getItem('my-key')).toBe('dark');
});

test('swallows failing writes so storage-unavailable browsers stay usable', () => {
  // The test setup polyfills localStorage as a plain object, so the spy is
  // installed on the instance (and catches every write, the initial one
  // included).
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
  // The value still updates in memory: the initial write and the update were
  // both attempted (and both swallowed).
  expect(result.current[0]).toBe('dark');
  expect(setItemSpy).toHaveBeenCalledTimes(2);
  expect(setItemSpy.mock.calls.at(-1)).toEqual(['my-key', 'dark']);
  setItemSpy.mockRestore();
});
