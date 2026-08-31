// JSON export/import: download, confirmation dialog, merging, cancel and bad files.
import App from './App';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// Compatibility layer for jest-dom with Vitest
import '@testing-library/jest-dom/vitest';
import { test, expect, vi } from 'vitest';

/**
 * "Export tasks" downloads the list as a JSON file. jsdom does not implement
 * URL.createObjectURL or anchor navigation, so both are stubbed. The blob
 * URL is revoked after a short delay (downloads start asynchronously in
 * some browsers), so the test advances fake timers before asserting.
 */
test('exports the task list as a JSON file', async () => {
  render(<App />);
  const titleInput = screen.getByLabelText(/^title/i);
  await userEvent.type(titleInput, 'Task A');
  await userEvent.click(screen.getByRole('button', { name: /add task/i }));

  let createdBlob;
  const createObjectURL = vi.fn((blob) => {
    createdBlob = blob;
    return 'blob:mock';
  });
  const revokeObjectURL = vi.fn();
  globalThis.URL.createObjectURL = createObjectURL;
  globalThis.URL.revokeObjectURL = revokeObjectURL;
  const clickSpy = vi
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(() => {});
  vi.useFakeTimers();
  try {
    // fireEvent (not userEvent): user‑event schedules its pointer events
    // through internal timers, which would never fire under fake timers.
    fireEvent.click(screen.getByRole('button', { name: 'Export tasks' }));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const exported = JSON.parse(await createdBlob.text());
    expect(exported).toHaveLength(1);
    expect(exported[0]).toMatchObject({ title: 'Task A', done: false });
    // The revoke is deferred, not synchronous with the click.
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
  } finally {
    vi.useRealTimers();
    clickSpy.mockRestore();
  }
});

/**
 * Importing into a non‑empty list asks for confirmation: the user can
 * replace the list, merge the import into it, or cancel.
 */
test('import into a non‑empty list asks for confirmation and replaces on confirm', async () => {
  render(<App />);
  const titleInput = screen.getByLabelText(/^title/i);
  await userEvent.type(titleInput, 'Existing');
  await userEvent.click(screen.getByRole('button', { name: /add task/i }));

  const file = new File(
    [JSON.stringify([{ id: 'i1', title: 'Imported', done: true }])],
    'tasks.json',
    { type: 'application/json' },
  );
  await userEvent.upload(document.querySelector('input[type="file"]'), file);

  // The list is not replaced until the user confirms
  expect(await screen.findByRole('dialog')).toBeInTheDocument();
  expect(screen.getByText('Existing')).toBeInTheDocument();
  expect(screen.queryByText('Imported')).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /replace list/i }));
  expect(await screen.findByText('Imported')).toBeInTheDocument();
  expect(screen.queryByText('Existing')).not.toBeInTheDocument();
  // The confirmation dialog has closed
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

test('import into an empty list replaces without confirmation', async () => {
  render(<App />);
  const file = new File(
    [JSON.stringify([{ id: 'i1', title: 'Imported', done: false }])],
    'tasks.json',
    { type: 'application/json' },
  );
  await userEvent.upload(document.querySelector('input[type="file"]'), file);

  expect(await screen.findByText('Imported')).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('import merging keeps existing tasks and adds the new ones', async () => {
  render(<App />);
  const titleInput = screen.getByLabelText(/^title/i);
  await userEvent.type(titleInput, 'Existing');
  await userEvent.click(screen.getByRole('button', { name: /add task/i }));
  // Read the generated id so the file can include a duplicate on purpose.
  const existingId = JSON.parse(localStorage.getItem('tasks')).tasks[0].id;

  const file = new File(
    [
      JSON.stringify([
        { id: existingId, title: 'Duplicate', done: false },
        { id: 'i2', title: 'New from file', done: false },
      ]),
    ],
    'tasks.json',
    { type: 'application/json' },
  );
  await userEvent.upload(document.querySelector('input[type="file"]'), file);

  await userEvent.click(
    await screen.findByRole('button', { name: /merge into list/i }),
  );
  // The confirmation dialog has closed
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // The existing task is kept (its id wins), the duplicate is skipped
  // and the new task is appended.
  expect(screen.getByText('Existing')).toBeInTheDocument();
  expect(screen.queryByText('Duplicate')).not.toBeInTheDocument();
  expect(screen.getByText('New from file')).toBeInTheDocument();
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
});

test('import cancel keeps the current list untouched', async () => {
  render(<App />);
  const titleInput = screen.getByLabelText(/^title/i);
  await userEvent.type(titleInput, 'Existing');
  await userEvent.click(screen.getByRole('button', { name: /add task/i }));

  const file = new File(
    [JSON.stringify([{ id: 'i1', title: 'Imported', done: false }])],
    'tasks.json',
    { type: 'application/json' },
  );
  await userEvent.upload(document.querySelector('input[type="file"]'), file);

  await userEvent.click(
    await screen.findByRole('button', { name: /^cancel$/i }),
  );
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  expect(screen.queryByText('Imported')).not.toBeInTheDocument();
  expect(screen.getByText('Existing')).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

/**
 * Importing a file that is not a valid task list shows an error and leaves
 * the current list untouched.
 */
test('rejects files that are not a valid task list', async () => {
  render(<App />);
  const file = new File([JSON.stringify({ not: 'a list' })], 'bad.json', {
    type: 'application/json',
  });
  await userEvent.upload(document.querySelector('input[type="file"]'), file);

  expect(await screen.findByText(/import failed/i)).toBeInTheDocument();
  expect(screen.getByText('No tasks yet. Add one above!')).toBeInTheDocument();
});
