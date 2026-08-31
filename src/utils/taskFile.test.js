import { describe, expect, test, vi } from 'vitest';
import { downloadTasks, parseTasksFile, tasksToJson } from './taskFile.js';

describe('tasksToJson', () => {
  test('serializes the task list as pretty‑printed JSON', () => {
    const tasks = [
      { id: 'a', title: 'A', description: '', done: false, subtasks: [] },
    ];
    expect(JSON.parse(tasksToJson(tasks))).toEqual(tasks);
    expect(tasksToJson(tasks)).toContain('\n');
  });
});

describe('parseTasksFile', () => {
  test('normalizes a valid task list', () => {
    const parsed = parseTasksFile(
      JSON.stringify([{ id: 'x', title: 'X', done: 'yes' }]),
    );
    expect(parsed).toEqual([
      { id: 'x', title: 'X', description: '', done: true, subtasks: [] },
    ]);
  });

  test('rejects invalid JSON', () => {
    expect(parseTasksFile('{not json')).toBeNull();
    expect(parseTasksFile('')).toBeNull();
  });

  test('rejects JSON that is not an array', () => {
    expect(parseTasksFile(JSON.stringify({ tasks: [] }))).toBeNull();
    expect(parseTasksFile(JSON.stringify('hello'))).toBeNull();
  });

  test('drops entries that are not task‑shaped', () => {
    expect(
      parseTasksFile(JSON.stringify(['junk', { id: 'x', title: 'X' }])),
    ).toEqual([
      { id: 'x', title: 'X', description: '', done: false, subtasks: [] },
    ]);
  });
});

describe('downloadTasks', () => {
  test('creates a blob URL, clicks a download anchor and defers revoking the URL', async () => {
    let createdBlob;
    const createObjectURL = vi.fn((blob) => {
      createdBlob = blob;
      return 'blob:mock';
    });
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    vi.useFakeTimers();
    try {
      downloadTasks(
        [{ id: 'a', title: 'A', done: true, subtasks: [] }],
        'export.json',
      );
      expect(clickSpy).toHaveBeenCalledTimes(1);
      // The URL must not be revoked synchronously – the download starts
      // asynchronously, so an immediate revoke could cancel it.
      expect(revokeObjectURL).not.toHaveBeenCalled();
      expect(JSON.parse(await createdBlob.text())).toHaveLength(1);
      vi.advanceTimersByTime(1000);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    } finally {
      vi.useRealTimers();
      clickSpy.mockRestore();
      vi.unstubAllGlobals();
    }
  });
});
