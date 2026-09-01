import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { todayISO } from '../utils/dates.js';
import { useDueDateReminders } from './useDueDateReminders.js';

// A stand‑in for the Notification API: records the created notifications
// and lets the tests control the permission state.
class MockNotification {
  static permission = 'granted';
  static instances = [];
  static requestPermission = vi.fn(() =>
    Promise.resolve(MockNotification.permission),
  );
  constructor(title, options) {
    MockNotification.instances.push({ title, ...options });
  }
}

const task = (id, title, due = todayISO(), done = false) => ({
  id,
  title,
  description: '',
  due,
  done,
  subtasks: [],
});

describe('useDueDateReminders', () => {
  beforeEach(() => {
    MockNotification.permission = 'granted';
    MockNotification.instances = [];
    MockNotification.requestPermission = vi.fn(() =>
      Promise.resolve(MockNotification.permission),
    );
    vi.stubGlobal('Notification', MockNotification);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  test('announces the tasks due today on mount (granted + enabled)', () => {
    renderHook(() => useDueDateReminders([task('t1', 'Water plants')]));
    expect(MockNotification.instances).toHaveLength(1);
    expect(MockNotification.instances[0]).toEqual({
      title: 'Task due today',
      body: 'Water plants',
    });
  });

  test('stays quiet for tasks that are not due today', () => {
    renderHook(() =>
      useDueDateReminders([
        task('t1', 'Tomorrow', '2999-01-01'),
        task('t2', 'Done today', todayISO(), true),
        task('t3', 'No date', null),
      ]),
    );
    expect(MockNotification.instances).toHaveLength(0);
  });

  test('announces each task at most once a day (also across remounts)', () => {
    const { rerender } = renderHook(({ tasks }) => useDueDateReminders(tasks), {
      initialProps: { tasks: [task('t1', 'Task A')] },
    });
    expect(MockNotification.instances).toHaveLength(1);

    // The interval re‑check does not repeat the announcement…
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(MockNotification.instances).toHaveLength(1);

    // …and neither does a "reload" (a fresh hook instance reads the
    // per‑day log from localStorage).
    renderHook(() => useDueDateReminders([task('t1', 'Task A')]));
    expect(MockNotification.instances).toHaveLength(1);

    // A new task due today gets its own announcement (naming only itself).
    act(() => {
      rerender({ tasks: [task('t1', 'Task A'), task('t2', 'Task B')] });
    });
    expect(MockNotification.instances).toHaveLength(2);
    expect(MockNotification.instances[1]).toEqual({
      title: 'Task due today',
      body: 'Task B',
    });
  });

  test('drops log entries for previous days when writing today’s log', () => {
    // A stale entry from an earlier day plus today's entry (t1 already
    // announced today, t2 not yet).
    localStorage.setItem(
      'todo-reminder-log',
      JSON.stringify({ '2020-01-01': ['stale'], [todayISO()]: ['t1'] }),
    );
    renderHook(() =>
      useDueDateReminders([task('t1', 'Task A'), task('t2', 'Task B')]),
    );
    // Only the fresh task is announced…
    expect(MockNotification.instances).toHaveLength(1);
    expect(MockNotification.instances[0].body).toBe('Task B');
    // …and the stored log now holds today's entry only: the stale day is
    // pruned, and both t1 and t2 are listed so neither is announced again
    // today.
    const log = JSON.parse(localStorage.getItem('todo-reminder-log'));
    expect(Object.keys(log)).toEqual([todayISO()]);
    expect(log[todayISO()]).toEqual(['t1', 't2']);
  });

  test('requests permission and starts announcing once granted', async () => {
    MockNotification.permission = 'default';
    // The user grants permission in the browser prompt.
    MockNotification.requestPermission = vi.fn(() =>
      Promise.resolve('granted'),
    );
    const { result } = renderHook(() =>
      useDueDateReminders([task('t1', 'Water plants')]),
    );
    expect(result.current.permission).toBe('default');
    expect(MockNotification.instances).toHaveLength(0);

    // The permission prompt resolves to "granted" → the state updates and
    // the (re‑run) check announces the due task.
    await act(async () => {
      result.current.requestPermission();
    });
    expect(MockNotification.requestPermission).toHaveBeenCalledTimes(1);
    expect(result.current.permission).toBe('granted');
    expect(MockNotification.instances).toHaveLength(1);
  });

  test('toggleEnabled flips the persisted on/off choice', () => {
    const { result } = renderHook(() => useDueDateReminders([]));
    expect(result.current.enabled).toBe(true);

    act(() => {
      result.current.toggleEnabled();
    });
    expect(result.current.enabled).toBe(false);
    expect(localStorage.getItem('todo-reminders')).toBe('off');

    act(() => {
      result.current.toggleEnabled();
    });
    expect(result.current.enabled).toBe(true);
    expect(localStorage.getItem('todo-reminders')).toBe('on');
  });

  test('a stored "off" choice keeps the reminders disabled', () => {
    localStorage.setItem('todo-reminders', 'off');
    const { result } = renderHook(() =>
      useDueDateReminders([task('t1', 'Water plants')]),
    );
    expect(result.current.enabled).toBe(false);
    expect(MockNotification.instances).toHaveLength(0);
  });

  test('a denied permission never announces', () => {
    MockNotification.permission = 'denied';
    const { result } = renderHook(() =>
      useDueDateReminders([task('t1', 'Water plants')]),
    );
    expect(result.current.permission).toBe('denied');
    expect(MockNotification.instances).toHaveLength(0);
  });

  test('falls back to "unsupported" when the Notification API is missing', () => {
    vi.unstubAllGlobals();
    expect(typeof Notification).toBe('undefined');
    const { result } = renderHook(() =>
      useDueDateReminders([task('t1', 'Water plants')]),
    );
    expect(result.current.permission).toBe('unsupported');
    expect(MockNotification.instances).toHaveLength(0);
    // Asking for permission (or toggling) must not crash without the API.
    act(() => {
      result.current.requestPermission();
      result.current.toggleEnabled();
    });
    expect(MockNotification.instances).toHaveLength(0);
  });

  test('re‑checks when the tab becomes visible again, but not while hidden', () => {
    renderHook(() => useDueDateReminders([task('t1', 'Water plants')]));
    expect(MockNotification.instances).toHaveLength(1);
    // Wipe the trail so a further check would be observable.
    MockNotification.instances.length = 0;
    localStorage.removeItem('todo-reminder-log');

    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    // Hidden: no check, nothing announced.
    expect(MockNotification.instances).toHaveLength(0);

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    // Visible: the check ran and announced the due task.
    expect(MockNotification.instances).toHaveLength(1);
  });
});
