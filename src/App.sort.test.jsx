// Due‑date sorting: the "Sort by due date" toggle in the filter bar shows
// the (filtered) list ordered by due date instead of the manual order,
// remembers the choice across reloads, and disables the manual reorder
// controls while it is active.
import App from './App';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// Compatibility layer for jest-dom with Vitest
import '@testing-library/jest-dom/vitest';
import { test, expect } from 'vitest';

// Add a task (optionally with a due date) through the new‑task form.
async function addTask(title, due = '') {
  await userEvent.type(screen.getByLabelText(/^title/i), title);
  if (due) {
    fireEvent.change(screen.getByLabelText(/^due date/i), {
      target: { value: due },
    });
  }
  await userEvent.click(screen.getByRole('button', { name: /add task/i }));
}

// The titles of the currently visible task rows, in display order.
const rowTitles = () =>
  screen
    .getAllByRole('listitem')
    .map((row) => row.querySelector('[id^="task-title-"]').textContent);

test('sorts the list by due date when the toggle is switched on', async () => {
  render(<App />);
  // A manual order that is NOT due‑date order, plus one undated task.
  await addTask('Mid', '2999-02-01');
  await addTask('Late', '2999-03-01');
  await addTask('Urgent', '2999-01-01');
  await addTask('No date');

  expect(rowTitles()).toEqual(['Mid', 'Late', 'Urgent', 'No date']);

  await userEvent.click(
    screen.getByRole('button', { name: 'Sort by due date' }),
  );
  // Earliest due date first; the undated task moves to the end.
  expect(rowTitles()).toEqual(['Urgent', 'Mid', 'Late', 'No date']);
});

test('restores the manual order when the sort is switched off again', async () => {
  render(<App />);
  await addTask('Mid', '2999-02-01');
  await addTask('Urgent', '2999-01-01');

  await userEvent.click(
    screen.getByRole('button', { name: 'Sort by due date' }),
  );
  expect(rowTitles()).toEqual(['Urgent', 'Mid']);

  await userEvent.click(
    screen.getByRole('button', { name: 'Sort by due date' }),
  );
  expect(rowTitles()).toEqual(['Mid', 'Urgent']);
});

test('applies the sort on top of the status filter', async () => {
  render(<App />);
  await addTask('Late', '2999-03-01');
  await addTask('Early', '2999-01-01');
  // Complete the later one so the Completed filter shows a single task…
  await userEvent.click(screen.getByRole('checkbox', { name: 'Late' }));
  // …and the active filter keeps the manual order for the remaining task.
  await userEvent.click(screen.getByRole('button', { name: 'Active' }));
  await userEvent.click(
    screen.getByRole('button', { name: 'Sort by due date' }),
  );
  expect(rowTitles()).toEqual(['Early']);

  // Back to "All": both tasks, in due‑date order.
  await userEvent.click(screen.getByRole('button', { name: 'All' }));
  expect(rowTitles()).toEqual(['Early', 'Late']);
});

test('remembers the due‑date sort across reloads', async () => {
  const view = render(<App />);
  await addTask('Late', '2999-03-01');
  await addTask('Early', '2999-01-01');
  await userEvent.click(
    screen.getByRole('button', { name: 'Sort by due date' }),
  );

  view.unmount();
  render(<App />);

  // The toggle is still pressed and the list is still sorted.
  expect(
    screen.getByRole('button', { name: 'Sort by due date' }),
  ).toHaveAttribute('aria-pressed', 'true');
  expect(rowTitles()).toEqual(['Early', 'Late']);
});

test('disables the manual reorder controls while the sort is active', async () => {
  render(<App />);
  await addTask('Mid', '2999-02-01');
  await addTask('Urgent', '2999-01-01');

  const first = () => screen.getAllByRole('listitem')[0];
  const second = () => screen.getAllByRole('listitem')[1];

  // Manual order: the buttons are enabled…
  expect(
    within(second()).getByRole('button', { name: 'Move task up' }),
  ).toBeEnabled();
  expect(
    within(second()).getByRole('button', { name: 'Reorder task' }),
  ).toBeEnabled();

  // …and stay so while the sort is on, where reordering would be hidden.
  await userEvent.click(
    screen.getByRole('button', { name: 'Sort by due date' }),
  );
  expect(
    within(first()).getByRole('button', { name: 'Move task down' }),
  ).toBeDisabled();
  expect(
    within(second()).getByRole('button', { name: 'Move task up' }),
  ).toBeDisabled();
  expect(
    within(first()).getByRole('button', { name: 'Reorder task' }),
  ).toBeDisabled();
  expect(
    within(second()).getByRole('button', { name: 'Reorder task' }),
  ).toBeDisabled();

  // Switching the sort off re‑enables them (and the manual order).
  await userEvent.click(
    screen.getByRole('button', { name: 'Sort by due date' }),
  );
  expect(rowTitles()).toEqual(['Mid', 'Urgent']);
  expect(
    within(second()).getByRole('button', { name: 'Move task up' }),
  ).toBeEnabled();
  expect(
    within(second()).getByRole('button', { name: 'Reorder task' }),
  ).toBeEnabled();
});
