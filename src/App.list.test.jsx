// List behaviour: filtering, search, reordering, undo and "clear completed".
import App from './App';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// Compatibility layer for jest-dom with Vitest
import '@testing-library/jest-dom/vitest';
import { test, expect } from 'vitest';

/**
 * The filter bar shows only the tasks matching the selected filter, and the
 * counter reflects how many tasks are still active.
 */
test('filters tasks by All / Active / Completed', async () => {
  render(<App />);
  const titleInput = screen.getByLabelText(/^title/i);
  const addTaskBtn = screen.getByRole('button', { name: /add task/i });
  await userEvent.type(titleInput, 'Task A');
  await userEvent.click(addTaskBtn);
  await userEvent.type(titleInput, 'Task B');
  await userEvent.click(addTaskBtn);

  // Complete the first task
  await userEvent.click(screen.getByRole('checkbox', { name: 'Task A' }));

  // The counter reflects the split
  expect(screen.getByText('1 of 2 tasks active')).toBeInTheDocument();

  // The Completed filter shows only the done task
  await userEvent.click(screen.getByRole('button', { name: 'Completed' }));
  expect(screen.getByText('Task A')).toBeInTheDocument();
  expect(screen.queryByText('Task B')).not.toBeInTheDocument();

  // The Active filter shows only the open task
  await userEvent.click(screen.getByRole('button', { name: 'Active' }));
  expect(screen.getByText('Task B')).toBeInTheDocument();
  expect(screen.queryByText('Task A')).not.toBeInTheDocument();

  // The All filter shows both again
  await userEvent.click(screen.getByRole('button', { name: 'All' }));
  expect(screen.getByText('Task A')).toBeInTheDocument();
  expect(screen.getByText('Task B')).toBeInTheDocument();
});

/**
 * When the active filter matches no tasks, a hint is shown instead of a
 * misleading empty list.
 */
test('shows a hint when the active filter has no matching tasks', async () => {
  render(<App />);
  const titleInput = screen.getByLabelText(/^title/i);
  await userEvent.type(titleInput, 'Task A');
  await userEvent.click(screen.getByRole('button', { name: /add task/i }));

  // Complete the only task, then switch to the Active filter
  await userEvent.click(screen.getByRole('checkbox', { name: 'Task A' }));
  await userEvent.click(screen.getByRole('button', { name: 'Active' }));
  expect(screen.getByText(/no active tasks/i)).toBeInTheDocument();
});

/**
 * "Clear completed" removes only the completed tasks and disappears once no
 * completed tasks remain.
 */
test('clear completed removes only the completed tasks and offers undo', async () => {
  render(<App />);
  const titleInput = screen.getByLabelText(/^title/i);
  const addTaskBtn = screen.getByRole('button', { name: /add task/i });
  await userEvent.type(titleInput, 'Task A');
  await userEvent.click(addTaskBtn);
  await userEvent.type(titleInput, 'Task B');
  await userEvent.click(addTaskBtn);

  // Complete both tasks – the "Clear completed" button appears
  await userEvent.click(screen.getByRole('checkbox', { name: 'Task A' }));
  await userEvent.click(screen.getByRole('checkbox', { name: 'Task B' }));
  const clearBtn = screen.getByRole('button', { name: /clear completed/i });
  await userEvent.click(clearBtn);

  expect(screen.queryByText('Task A')).not.toBeInTheDocument();
  expect(screen.queryByText('Task B')).not.toBeInTheDocument();
  // No completed tasks left -> the button is gone
  expect(
    screen.queryByRole('button', { name: /clear completed/i }),
  ).not.toBeInTheDocument();
  // The snackbar reports how many tasks were cleared and offers an undo
  expect(await screen.findByText('Deleted 2 tasks')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /^undo$/i }));
  // Both tasks are back, in their original order
  const items = screen.getAllByRole('listitem');
  expect(items).toHaveLength(2);
  expect(items[0]).toHaveAccessibleName('Task A');
  expect(items[1]).toHaveAccessibleName('Task B');
});

/**
 * Deleting a task offers an undo: the snackbar action re‑inserts the task
 * at its original position.
 */
test('undo restores a deleted task at its original position', async () => {
  render(<App />);
  const titleInput = screen.getByLabelText(/^title/i);
  const addTaskBtn = screen.getByRole('button', { name: /add task/i });
  await userEvent.type(titleInput, 'Task A');
  await userEvent.click(addTaskBtn);
  await userEvent.type(titleInput, 'Task B');
  await userEvent.click(addTaskBtn);

  const itemA = screen.getByRole('listitem', { name: 'Task A' });
  await userEvent.click(
    within(itemA).getByRole('button', { name: 'Delete task' }),
  );
  expect(screen.queryByText('Task A')).not.toBeInTheDocument();
  // The snackbar names the deleted task and offers an undo
  expect(await screen.findByText('Deleted "Task A"')).toBeInTheDocument();

  await userEvent.click(await screen.findByRole('button', { name: /^undo$/i }));
  expect(screen.getByText('Task A')).toBeInTheDocument();
  // The task must be back at its original position (before Task B).
  const items = screen.getAllByRole('listitem');
  expect(items[0]).toHaveAccessibleName('Task A');
  expect(items[1]).toHaveAccessibleName('Task B');
});

/**
 * The search box filters the list by title or description (subtask titles
 * are matched too – covered in utils/taskList.test.js). The query is
 * transient, and a query without matches shows a hint.
 */
test('search filters the list by title and description', async () => {
  render(<App />);
  const titleInput = screen.getByLabelText(/^title/i);
  const descInput = screen.getByLabelText(/^description/i);
  const addTaskBtn = screen.getByRole('button', { name: /add task/i });

  await userEvent.type(titleInput, 'Buy milk');
  await userEvent.type(descInput, 'two liters');
  await userEvent.click(addTaskBtn);
  await userEvent.type(titleInput, 'Ship release');
  await userEvent.click(addTaskBtn);

  const searchInput = screen.getByRole('textbox', { name: 'Search tasks' });

  // Matches on the title
  await userEvent.type(searchInput, 'milk');
  expect(screen.getByText('Buy milk')).toBeInTheDocument();
  expect(screen.queryByText('Ship release')).not.toBeInTheDocument();

  // Matches on the description, too
  await userEvent.clear(searchInput);
  await userEvent.type(searchInput, 'liters');
  expect(screen.getByText('Buy milk')).toBeInTheDocument();
  expect(screen.queryByText('Ship release')).not.toBeInTheDocument();

  // A query without matches shows a hint instead of the list
  await userEvent.clear(searchInput);
  await userEvent.type(searchInput, 'zzz');
  expect(screen.getByText(/no tasks match/i)).toBeInTheDocument();
  expect(screen.queryByRole('listitem')).not.toBeInTheDocument();

  // Clearing the search restores the full list
  await userEvent.clear(searchInput);
  expect(screen.getByText('Buy milk')).toBeInTheDocument();
  expect(screen.getByText('Ship release')).toBeInTheDocument();
});

/**
 * "Move task up/down" swaps a task with its neighbour; the buttons are
 * disabled at the edges of the visible list.
 */
test('moves a task down and back up again', async () => {
  render(<App />);
  const titleInput = screen.getByLabelText(/^title/i);
  const addTaskBtn = screen.getByRole('button', { name: /add task/i });

  await userEvent.type(titleInput, 'Task A');
  await userEvent.click(addTaskBtn);
  await userEvent.type(titleInput, 'Task B');
  await userEvent.click(addTaskBtn);

  const taskA = screen.getByRole('listitem', { name: 'Task A' });

  // First row: "move up" is disabled; "move down" swaps with Task B
  expect(
    within(taskA).getByRole('button', { name: 'Move task up' }),
  ).toBeDisabled();
  await userEvent.click(
    within(taskA).getByRole('button', { name: 'Move task down' }),
  );

  let rows = screen.getAllByRole('listitem');
  expect(within(rows[0]).getByText('Task B')).toBeInTheDocument();
  expect(within(rows[1]).getByText('Task A')).toBeInTheDocument();

  // Last row: "move down" is disabled; move Task A back to the top
  expect(
    within(rows[1]).getByRole('button', { name: 'Move task down' }),
  ).toBeDisabled();
  await userEvent.click(
    within(rows[1]).getByRole('button', { name: 'Move task up' }),
  );

  rows = screen.getAllByRole('listitem');
  expect(within(rows[0]).getByText('Task A')).toBeInTheDocument();
  expect(within(rows[1]).getByText('Task B')).toBeInTheDocument();
});

/**
 * While a filter hides tasks, the move buttons operate on the *visible*
 * list: a task swaps with its visible neighbour in the full list.
 */
test('moves tasks within the visible list while a filter is active', async () => {
  render(<App />);
  const titleInput = screen.getByLabelText(/^title/i);
  const addTaskBtn = screen.getByRole('button', { name: /add task/i });

  await userEvent.type(titleInput, 'First');
  await userEvent.click(addTaskBtn);
  await userEvent.type(titleInput, 'Second');
  await userEvent.click(addTaskBtn);
  await userEvent.type(titleInput, 'Third');
  await userEvent.click(addTaskBtn);

  // Complete the middle task and show only the active ones
  await userEvent.click(screen.getByRole('checkbox', { name: 'Second' }));
  await userEvent.click(screen.getByRole('button', { name: 'Active' }));

  // Visible: First, Third – move "Third" up (it swaps with "First")
  const third = screen.getByRole('listitem', { name: 'Third' });
  await userEvent.click(
    within(third).getByRole('button', { name: 'Move task up' }),
  );

  const visible = screen.getAllByRole('listitem');
  expect(within(visible[0]).getByText('Third')).toBeInTheDocument();
  expect(within(visible[1]).getByText('First')).toBeInTheDocument();

  // Back to "All": the completed task stays between them
  await userEvent.click(screen.getByRole('button', { name: 'All' }));
  const all = screen.getAllByRole('listitem');
  expect(within(all[0]).getByText('Third')).toBeInTheDocument();
  expect(within(all[1]).getByText('Second')).toBeInTheDocument();
  expect(within(all[2]).getByText('First')).toBeInTheDocument();
});
