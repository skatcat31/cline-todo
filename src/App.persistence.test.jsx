// localStorage persistence: loading, normalizing, saving, warnings and the remembered filter.
import App from './App';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// Compatibility layer for jest-dom with Vitest
import '@testing-library/jest-dom/vitest';
import { STORAGE_VERSION } from './hooks/useTasks.js';
import { test, expect, vi } from 'vitest';

/**
 * Tasks stored in localStorage under the `tasks` key are loaded on mount,
 * including their done state and subtasks.
 */
test('loads tasks from localStorage on mount', () => {
  localStorage.setItem(
    'tasks',
    JSON.stringify([
      {
        id: 'stored-1',
        title: 'Stored task',
        description: 'Stored description',
        done: true,
        subtasks: [
          {
            id: 'stored-sub-1',
            title: 'Stored subtask',
            description: '',
            done: false,
          },
        ],
      },
    ]),
  );
  render(<App />);
  expect(screen.getByText('Stored task')).toBeInTheDocument();
  expect(screen.getByText('Stored description')).toBeInTheDocument();
  expect(screen.getByText('Stored subtask')).toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: 'Stored task' })).toBeChecked();
});

/**
 * Corrupt JSON in localStorage must not crash the app: the error is logged,
 * no tasks are loaded and the empty state is shown.
 */
test('ignores corrupt JSON in localStorage', () => {
  localStorage.setItem('tasks', '{ not valid json');
  render(<App />);
  expect(screen.getByText('No tasks yet. Add one above!')).toBeInTheDocument();
});

/**
 * Well-formed JSON with a wrong shape (e.g. an object instead of an array)
 * is normalized away instead of being rendered blindly.
 */
test('normalizes badly shaped task data from localStorage', () => {
  localStorage.setItem('tasks', JSON.stringify({ not: 'an array' }));
  render(<App />);
  expect(screen.getByText('No tasks yet. Add one above!')).toBeInTheDocument();
});

/**
 * Tasks are written to localStorage as a versioned payload whenever they
 * change.
 */
test('persists tasks to localStorage as they change', async () => {
  render(<App />);
  const titleInput = screen.getByLabelText(/^title/i);
  await userEvent.type(titleInput, 'Persisted task');
  await userEvent.click(screen.getByRole('button', { name: /add task/i }));
  const stored = JSON.parse(localStorage.getItem('tasks'));
  expect(stored.version).toBe(STORAGE_VERSION);
  expect(stored.activeListId).toBe('default');
  expect(stored.lists).toHaveLength(1);
  expect(stored.lists[0].tasks).toHaveLength(1);
  expect(stored.lists[0].tasks[0]).toMatchObject({
    title: 'Persisted task',
    description: '',
    done: false,
    subtasks: [],
  });
});

/**
 * When the browser refuses to persist the task list (quota exceeded,
 * private‑browsing mode, …) the app stays usable but shows a persistent
 * warning instead of failing silently.
 */
test('warns while tasks cannot be persisted', async () => {
  const setItemSpy = vi
    .spyOn(globalThis.localStorage, 'setItem')
    .mockImplementation(() => {
      throw new Error('quota exceeded');
    });
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    render(<App />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/could not be saved/i)).toBeInTheDocument();
  } finally {
    setItemSpy.mockRestore();
    errorSpy.mockRestore();
  }
});

/**
 * The active filter is persisted, so a "reload" (unmount + mount) restores
 * the previously selected view.
 */
test('remembers the selected filter across reloads', async () => {
  const view = render(<App />);
  const titleInput = screen.getByLabelText(/^title/i);
  await userEvent.type(titleInput, 'Task A');
  await userEvent.click(screen.getByRole('button', { name: /add task/i }));
  await userEvent.click(screen.getByRole('checkbox', { name: 'Task A' }));
  await userEvent.click(screen.getByRole('button', { name: 'Completed' }));

  view.unmount();
  render(<App />);
  expect(screen.getByRole('button', { name: 'Completed' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

/**
 * A pre‑v2 payload (the versioned { version, tasks } shape from the
 * single‑list era) is upgraded to the multi‑list state: the tasks are kept
 * in a single "To‑Do" list and the app keeps working.
 */
test('upgrades a v1 single‑list payload to the multi‑list state', async () => {
  localStorage.setItem(
    'tasks',
    JSON.stringify({
      version: 1,
      tasks: [
        {
          id: 'v1-1',
          title: 'Legacy task',
          description: '',
          done: false,
          subtasks: [],
        },
      ],
    }),
  );
  render(<App />);
  // The legacy task is shown under the default list…
  expect(screen.getByRole('listitem', { name: 'Legacy task' })).toBeVisible();
  expect(screen.getByRole('tab', { name: 'To-Do' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  // …and the next write stores the upgraded (multi‑list) payload.
  await userEvent.type(screen.getByLabelText(/^title/i), 'New task');
  await userEvent.click(screen.getByRole('button', { name: /add task/i }));
  const stored = JSON.parse(localStorage.getItem('tasks'));
  expect(stored.version).toBe(STORAGE_VERSION);
  expect(stored.lists[0].name).toBe('To-Do');
  expect(stored.lists[0].tasks.map((t) => t.title)).toEqual([
    'Legacy task',
    'New task',
  ]);
});
