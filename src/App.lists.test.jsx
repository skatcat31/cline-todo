// Multiple task lists: creating, renaming, deleting and switching lists,
// per‑list task isolation, the active list surviving a reload, and undo
// restoring a task into the list it came from.
import App from './App';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// Compatibility layer for jest-dom with Vitest
import '@testing-library/jest-dom/vitest';
import { test, expect } from 'vitest';

// Add a task (into the active list) through the new‑task form.
async function addTask(title) {
  await userEvent.type(screen.getByLabelText(/^title/i), title);
  await userEvent.click(screen.getByRole('button', { name: /add task/i }));
}

// Create a new list through the "New list" dialog.
async function createList(name) {
  await userEvent.click(screen.getByRole('button', { name: 'New list' }));
  await userEvent.type(await screen.findByLabelText('List name'), name);
  await userEvent.click(screen.getByRole('button', { name: 'Create list' }));
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  );
}

// The titles of the currently visible task rows, in display order.
const rowTitles = () =>
  screen
    .getAllByRole('listitem')
    .map((row) => row.querySelector('[id^="task-title-"]').textContent);

test('creates a new list, switches to it and persists both lists', async () => {
  render(<App />);
  await createList('Work');
  // The new tab is selected, the old one is not…
  expect(screen.getByRole('tab', { name: 'Work' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  expect(screen.getByRole('tab', { name: 'To-Do' })).toHaveAttribute(
    'aria-selected',
    'false',
  );
  // …the new list is empty, so the empty state is shown.
  expect(screen.getByText('No tasks yet. Add one above!')).toBeInTheDocument();
  // …and the payload holds both lists, the new one active.
  const stored = JSON.parse(localStorage.getItem('tasks'));
  expect(stored.lists.map((list) => list.name)).toEqual(['To-Do', 'Work']);
  expect(stored.activeListId).toBe(stored.lists[1].id);
});

test('keeps the tasks of each list apart', async () => {
  render(<App />);
  await addTask('Personal task');
  await createList('Work');
  await addTask('Work task');
  // The new list shows only its own task…
  expect(rowTitles()).toEqual(['Work task']);
  // …and the first list still has its own.
  await userEvent.click(screen.getByRole('tab', { name: 'To-Do' }));
  expect(rowTitles()).toEqual(['Personal task']);
});

test('renames the active list from the list options menu', async () => {
  render(<App />);
  await createList('Work');
  await userEvent.click(screen.getByRole('button', { name: 'List options' }));
  await userEvent.click(
    await screen.findByRole('menuitem', { name: 'Rename list' }),
  );
  // The input is pre‑filled with the current name…
  const input = await screen.findByLabelText('List name');
  expect(input).toHaveValue('Work');
  await userEvent.clear(input);
  await userEvent.type(input, 'Side projects');
  await userEvent.click(screen.getByRole('button', { name: 'Rename list' }));
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  );
  // …and the tab carries the new name.
  expect(
    screen.getByRole('tab', { name: 'Side projects' }),
  ).toBeInTheDocument();
  expect(screen.queryByRole('tab', { name: 'Work' })).not.toBeInTheDocument();
});

test('deletes a list and its tasks after confirming', async () => {
  render(<App />);
  await addTask('Kept');
  await createList('Work');
  await addTask('Gone');
  // "Work" is the active list, so its options menu acts on it.
  await userEvent.click(screen.getByRole('button', { name: 'List options' }));
  await userEvent.click(
    await screen.findByRole('menuitem', { name: 'Delete list' }),
  );
  await userEvent.click(
    await screen.findByRole('button', { name: 'Delete list' }),
  );
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  );
  // The list and its task are gone; the remaining list takes over.
  expect(screen.queryByRole('tab', { name: 'Work' })).not.toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'To-Do' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  expect(rowTitles()).toEqual(['Kept']);
});

test('cannot delete the last remaining list', async () => {
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: 'List options' }));
  const deleteItem = await screen.findByRole('menuitem', {
    name: 'Delete list',
  });
  expect(deleteItem).toHaveClass('Mui-disabled');
});

test('remembers the active list across reloads', async () => {
  const view = render(<App />);
  await createList('Work');
  view.unmount();
  render(<App />);
  expect(screen.getByRole('tab', { name: 'Work' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  expect(screen.getByRole('tab', { name: 'To-Do' })).toHaveAttribute(
    'aria-selected',
    'false',
  );
});

test('undo restores a deleted task into its own list', async () => {
  render(<App />);
  await addTask('Personal task');
  await createList('Work');
  await addTask('Work task');
  // Delete a task from "Work" (the active list)…
  const workItem = screen.getByRole('listitem', { name: 'Work task' });
  await userEvent.click(
    within(workItem).getByRole('button', { name: 'Delete task' }),
  );
  // …switch to the other list before undoing…
  await userEvent.click(screen.getByRole('tab', { name: 'To-Do' }));
  // …then undo.
  await userEvent.click(await screen.findByRole('button', { name: /^undo$/i }));
  // The task is back in "Work", not in the list shown now.
  expect(rowTitles()).toEqual(['Personal task']);
  await userEvent.click(screen.getByRole('tab', { name: 'Work' }));
  expect(rowTitles()).toEqual(['Work task']);
});
