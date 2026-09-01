import { describe, expect, test } from 'vitest';
import { todayISO } from './dates.js';
import { dueOnTasks, reminderNotification } from './reminders.js';

const task = (id, title, due, done = false) => ({
  id,
  title,
  description: '',
  due,
  done,
  subtasks: [],
});

describe('dueOnTasks', () => {
  test('selects only the unfinished tasks due on the given date', () => {
    const tasks = [
      task('a', 'Due', '2026-08-31'),
      task('b', 'Done', '2026-08-31', true),
      task('c', 'Tomorrow', '2026-09-01'),
      task('d', 'No date', null),
    ];
    expect(dueOnTasks(tasks, '2026-08-31').map((t) => t.id)).toEqual(['a']);
  });

  test('defaults to today', () => {
    const tasks = [
      task('a', 'Today', todayISO()),
      task('b', 'Done today', todayISO(), true),
      task('c', 'Later', '2999-01-01'),
    ];
    expect(dueOnTasks(tasks).map((t) => t.id)).toEqual(['a']);
  });

  test('returns an empty list when nothing is due', () => {
    expect(dueOnTasks([], '2026-08-31')).toEqual([]);
    expect(
      dueOnTasks([task('a', 'Later', '2999-01-01')], '2026-08-31'),
    ).toEqual([]);
  });
});

describe('reminderNotification', () => {
  test('returns null for an empty list', () => {
    expect(reminderNotification([])).toBeNull();
  });

  test('names a single task with the singular title', () => {
    expect(reminderNotification([task('a', 'Buy milk', 'x')])).toEqual({
      title: 'Task due today',
      body: 'Buy milk',
    });
  });

  test('names two or three tasks in the body', () => {
    expect(
      reminderNotification([task('a', 'A', 'x'), task('b', 'B', 'x')]),
    ).toEqual({ title: '2 tasks due today', body: 'A, B' });
    expect(
      reminderNotification([
        task('a', 'A', 'x'),
        task('b', 'B', 'x'),
        task('c', 'C', 'x'),
      ]),
    ).toEqual({ title: '3 tasks due today', body: 'A, B, C' });
  });

  test('summarizes the overflow beyond three tasks', () => {
    const payload = reminderNotification([
      task('a', 'A', 'x'),
      task('b', 'B', 'x'),
      task('c', 'C', 'x'),
      task('d', 'D', 'x'),
      task('e', 'E', 'x'),
    ]);
    expect(payload).toEqual({
      title: '5 tasks due today',
      body: 'A, B, C and 2 more',
    });
  });
});
