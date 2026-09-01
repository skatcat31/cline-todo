import { describe, expect, test, vi } from 'vitest';
import {
  STORAGE_KEY,
  STORAGE_VERSION,
  parseStoredPayload,
} from './taskPayload.js';

/**
 * Unit tests for the persisted task payload (utils/taskPayload.js):
 * parsing, the upgrade of older payload versions and the default state
 * the parser falls back to.
 */
describe('parseStoredPayload', () => {
  // The state the parser falls back to whenever the stored value is
  // missing or unusable.
  const defaultEmpty = {
    lists: [{ id: 'default', name: 'To-Do', tasks: [] }],
    activeListId: 'default',
  };

  test('reads a current versioned payload and keeps it as is', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: STORAGE_VERSION,
        activeListId: 'l2',
        lists: [
          {
            id: 'l1',
            name: 'First',
            tasks: [
              {
                id: '1',
                title: 'A',
                description: '',
                due: null,
                done: false,
                subtasks: [],
              },
            ],
          },
          { id: 'l2', name: 'Second', tasks: [] },
        ],
      }),
    );
    const payload = parseStoredPayload(localStorage.getItem(STORAGE_KEY));
    expect(payload.activeListId).toBe('l2');
    expect(payload.lists).toHaveLength(2);
    expect(payload.lists[0].tasks).toEqual([
      {
        id: '1',
        title: 'A',
        description: '',
        due: null,
        done: false,
        subtasks: [],
      },
    ]);
  });

  test('falls back to the first list when the active id is stale', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: STORAGE_VERSION,
        activeListId: 'gone',
        lists: [{ id: 'l1', name: 'First', tasks: [] }],
      }),
    );
    const payload = parseStoredPayload(localStorage.getItem(STORAGE_KEY));
    expect(payload.activeListId).toBe('l1');
  });

  test('upgrades the legacy bare-array payload into a single list', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { id: '1', title: 'A', done: false, description: '', subtasks: [] },
      ]),
    );
    const payload = parseStoredPayload(localStorage.getItem(STORAGE_KEY));
    expect(payload.activeListId).toBe('default');
    expect(payload.lists).toEqual([
      {
        id: 'default',
        name: 'To-Do',
        tasks: [
          {
            id: '1',
            title: 'A',
            description: '',
            due: null,
            done: false,
            subtasks: [],
          },
        ],
      },
    ]);
  });

  test('upgrades the legacy versioned { tasks } payload into a single list', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: STORAGE_VERSION,
        tasks: [
          { id: '1', title: 'A', done: false, description: '', subtasks: [] },
        ],
      }),
    );
    const payload = parseStoredPayload(localStorage.getItem(STORAGE_KEY));
    expect(payload.lists).toHaveLength(1);
    expect(payload.lists[0].name).toBe('To-Do');
    expect(payload.lists[0].tasks).toHaveLength(1);
  });

  test('returns the default state for invalid JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(parseStoredPayload(localStorage.getItem(STORAGE_KEY))).toEqual(
        defaultEmpty,
      );
    } finally {
      errorSpy.mockRestore();
    }
  });

  test('returns the default state when nothing is stored', () => {
    localStorage.removeItem(STORAGE_KEY);
    expect(parseStoredPayload(localStorage.getItem(STORAGE_KEY))).toEqual(
      defaultEmpty,
    );
  });

  test('returns the default state for an unrecognized shape', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, notLists: true }),
    );
    expect(parseStoredPayload(localStorage.getItem(STORAGE_KEY))).toEqual(
      defaultEmpty,
    );
  });
});
