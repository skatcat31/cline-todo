import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  dueBadge,
  formatDueDate,
  isValidISODate,
  normalizeDue,
  toISODate,
  todayISO,
} from './dates.js';

// Pin "today" to a known date so the relative‑date tests never flake
// depending on when they run.
afterEach(() => {
  vi.useRealTimers();
});

describe('toISODate', () => {
  test('formats a date as a local calendar date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 10, 23, 59));
    expect(toISODate(new Date(2026, 8, 10))).toBe('2026-09-10');
  });

  test('pads single‑digit months and days', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  test('does not shift the date into UTC', () => {
    // In time zones east of UTC (e.g. UTC+10) late‑night local times have
    // already passed midnight UTC; the calendar date must stay local.
    const date = new Date(2026, 8, 10, 23, 30);
    expect(toISODate(date)).toBe('2026-09-10');
  });
});

describe('todayISO', () => {
  test('returns the current local calendar date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 10, 6, 0));
    expect(todayISO()).toBe('2026-09-10');
  });
});

describe('isValidISODate', () => {
  test('accepts well‑formed, real calendar dates', () => {
    expect(isValidISODate('2026-09-10')).toBe(true);
    expect(isValidISODate('2024-02-29')).toBe(true); // leap year
  });

  test('rejects malformed values', () => {
    expect(isValidISODate('2026-1-5')).toBe(false);
    expect(isValidISODate('10-09-2026')).toBe(false);
    expect(isValidISODate('2026-09-10T12:00:00Z')).toBe(false);
    expect(isValidISODate(20260910)).toBe(false);
    expect(isValidISODate(null)).toBe(false);
    expect(isValidISODate('')).toBe(false);
  });

  test('rejects impossible calendar dates', () => {
    expect(isValidISODate('2026-02-30')).toBe(false);
    expect(isValidISODate('2026-04-31')).toBe(false);
    expect(isValidISODate('2023-02-29')).toBe(false);
    expect(isValidISODate('2026-13-01')).toBe(false);
  });
});

describe('normalizeDue', () => {
  test('keeps valid dates and turns anything else into null', () => {
    expect(normalizeDue('2026-09-10')).toBe('2026-09-10');
    expect(normalizeDue('garbage')).toBeNull();
    expect(normalizeDue(null)).toBeNull();
    expect(normalizeDue(undefined)).toBeNull();
    expect(normalizeDue({})).toBeNull();
  });
});

describe('formatDueDate', () => {
  test('formats same‑year dates without the year', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 10, 12, 0));
    expect(formatDueDate('2026-09-15')).toBe('Sep 15');
  });

  test('includes the year for dates in another year', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 10, 12, 0));
    expect(formatDueDate('2030-09-15')).toBe('Sep 15, 2030');
  });

  test('returns an empty string for invalid or missing dates', () => {
    expect(formatDueDate(null)).toBe('');
    expect(formatDueDate('nope')).toBe('');
  });
});

describe('dueBadge', () => {
  test('is null without a due date', () => {
    expect(dueBadge({ due: null, done: false })).toBeNull();
    expect(dueBadge({ done: false })).toBeNull();
  });

  test('marks an unfinished task past its due date as overdue', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 10, 12, 0));
    expect(dueBadge({ due: '2026-09-03', done: false })).toEqual({
      text: 'Overdue (due Sep 3)',
      severity: 'error',
    });
  });

  test('marks an unfinished task due today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 10, 12, 0));
    expect(dueBadge({ due: '2026-09-10', done: false })).toEqual({
      text: 'Due today',
      severity: 'warning',
    });
  });

  test('shows a plain badge for future dates', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 10, 12, 0));
    expect(dueBadge({ due: '2026-09-15', done: false })).toEqual({
      text: 'Due Sep 15',
      severity: 'default',
    });
  });

  test('shows a plain badge for done tasks even when the date has passed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 10, 12, 0));
    expect(dueBadge({ due: '2026-09-03', done: true })).toEqual({
      text: 'Due Sep 3',
      severity: 'default',
    });
  });
});
