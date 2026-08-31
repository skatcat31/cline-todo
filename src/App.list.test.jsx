// List behaviour: filtering, search, reordering, undo and "clear completed".
import App from './App';
import { act, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// Compatibility layer for jest-dom with Vitest
import '@testing-library/jest-dom/vitest';
import { test, expect, vi } from 'vitest';

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
 * Multi‑level undo: each deletion pushes an entry onto a stack (most
 * recent last), so several deletions can be undone one by one – the
 * snackbar walks back through the stack and closes once it is empty.
 */
test('multiple deletions are undone one by one, most recent first', async () => {
  render(<App />);
  const titleInput = screen.getByLabelText(/^title/i);
  const addTaskBtn = screen.getByRole('button', { name: /add task/i });
  await userEvent.type(titleInput, 'Task A');
  await userEvent.click(addTaskBtn);
  await userEvent.type(titleInput, 'Task B');
  await userEvent.click(addTaskBtn);

  await userEvent.click(
    within(screen.getByRole('listitem', { name: 'Task A' })).getByRole(
      'button',
      { name: 'Delete task' },
    ),
  );
  await userEvent.click(
    within(screen.getByRole('listitem', { name: 'Task B' })).getByRole(
      'button',
      { name: 'Delete task' },
    ),
  );
  // The snackbar offers the *latest* delete
  expect(await screen.findByText('Deleted "Task B"')).toBeInTheDocument();

  // Undo once: the most recent delete (Task B) is restored, and the
  // snackbar now offers the earlier one (Task A).
  await userEvent.click(screen.getByRole('button', { name: /^undo$/i }));
  expect(screen.getByText('Task B')).toBeInTheDocument();
  expect(screen.queryByText('Task A')).not.toBeInTheDocument();
  expect(await screen.findByText('Deleted "Task A"')).toBeInTheDocument();

  // Undo again: Task A comes back at its original position and the
  // snackbar closes.
  await userEvent.click(screen.getByRole('button', { name: /^undo$/i }));
  const items = screen.getAllByRole('listitem');
  expect(items[0]).toHaveAccessibleName('Task A');
  expect(items[1]).toHaveAccessibleName('Task B');
  await waitFor(() =>
    expect(
      screen.queryByRole('button', { name: /^undo$/i }),
    ).not.toBeInTheDocument(),
  );
});

test('undo works in reverse order across mixed actions (clear completed then delete)', async () => {
  render(<App />);
  const titleInput = screen.getByLabelText(/^title/i);
  const addTaskBtn = screen.getByRole('button', { name: /add task/i });
  await userEvent.type(titleInput, 'Task A');
  await userEvent.click(addTaskBtn);
  await userEvent.type(titleInput, 'Task B');
  await userEvent.click(addTaskBtn);
  await userEvent.type(titleInput, 'Task C');
  await userEvent.click(addTaskBtn);

  // Complete A and B, then clear them (first stack entry)
  await userEvent.click(screen.getByRole('checkbox', { name: 'Task A' }));
  await userEvent.click(screen.getByRole('checkbox', { name: 'Task B' }));
  await userEvent.click(
    screen.getByRole('button', { name: /clear completed/i }),
  );
  expect(await screen.findByText('Deleted 2 tasks')).toBeInTheDocument();

  // Delete C (newer stack entry)
  await userEvent.click(
    within(screen.getByRole('listitem', { name: 'Task C' })).getByRole(
      'button',
      { name: 'Delete task' },
    ),
  );
  expect(await screen.findByText('Deleted "Task C"')).toBeInTheDocument();

  // Undo the delete first…
  await userEvent.click(screen.getByRole('button', { name: /^undo$/i }));
  expect(screen.getByText('Task C')).toBeInTheDocument();
  expect(screen.queryByText('Task A')).not.toBeInTheDocument();
  // …then undo the clear
  await userEvent.click(screen.getByRole('button', { name: /^undo$/i }));
  const items = screen.getAllByRole('listitem');
  expect(items[0]).toHaveAccessibleName('Task A');
  expect(items[1]).toHaveAccessibleName('Task B');
  expect(items[2]).toHaveAccessibleName('Task C');
  await waitFor(() =>
    expect(
      screen.queryByRole('button', { name: /^undo$/i }),
    ).not.toBeInTheDocument(),
  );
});

test('the undo stack keeps only the most recent five deletions', async () => {
  render(<App />);
  const titleInput = screen.getByLabelText(/^title/i);
  const addTaskBtn = screen.getByRole('button', { name: /add task/i });
  for (const name of ['T1', 'T2', 'T3', 'T4', 'T5', 'T6']) {
    await userEvent.type(titleInput, name);
    await userEvent.click(addTaskBtn);
  }
  for (const name of ['T1', 'T2', 'T3', 'T4', 'T5', 'T6']) {
    await userEvent.click(
      within(screen.getByRole('listitem', { name })).getByRole('button', {
        name: 'Delete task',
      }),
    );
  }
  // Undo five times: the most recent five deletions come back (T6…T2)
  for (const name of ['T6', 'T5', 'T4', 'T3', 'T2']) {
    await userEvent.click(screen.getByRole('button', { name: /^undo$/i }));
    expect(screen.getByText(name)).toBeInTheDocument();
  }
  // The first delete (T1) was dropped from the full stack
  expect(screen.queryByText('T1')).not.toBeInTheDocument();
  await waitFor(() =>
    expect(
      screen.queryByRole('button', { name: /^undo$/i }),
    ).not.toBeInTheDocument(),
  );
});

test('pressing Escape discards all pending undos', async () => {
  render(<App />);
  const titleInput = screen.getByLabelText(/^title/i);
  const addTaskBtn = screen.getByRole('button', { name: /add task/i });
  await userEvent.type(titleInput, 'Task A');
  await userEvent.click(addTaskBtn);
  await userEvent.type(titleInput, 'Task B');
  await userEvent.click(addTaskBtn);

  await userEvent.click(
    within(screen.getByRole('listitem', { name: 'Task A' })).getByRole(
      'button',
      { name: 'Delete task' },
    ),
  );
  await userEvent.click(
    within(screen.getByRole('listitem', { name: 'Task B' })).getByRole(
      'button',
      { name: 'Delete task' },
    ),
  );
  expect(await screen.findByText('Deleted "Task B"')).toBeInTheDocument();

  // Dismiss the snackbar via the Escape key
  await userEvent.keyboard('{Escape}');
  await waitFor(() =>
    expect(
      screen.queryByRole('button', { name: /^undo$/i }),
    ).not.toBeInTheDocument(),
  );
  // No undo is offered anymore and both tasks stay gone
  expect(screen.queryByText('Task A')).not.toBeInTheDocument();
  expect(screen.queryByText('Task B')).not.toBeInTheDocument();
});

/**
 * When the snackbar auto‑hides, only the newest undo is dropped: the
 * snackbar re‑opens for the previous pending undo (its fresh key restarts
 * the auto‑hide timer) instead of discarding the whole stack after one
 * 6‑second window.
 */
test('auto-hide offers the previous undo instead of discarding the stack', async () => {
  // Fake timers (auto‑advancing, so userEvent's internal delays keep
  // resolving) make the 6‑second auto‑hide jumpable without waiting for it.
  vi.useFakeTimers({ shouldAdvanceTime: true });
  try {
    render(<App />);
    const titleInput = screen.getByLabelText(/^title/i);
    const addTaskBtn = screen.getByRole('button', { name: /add task/i });
    await userEvent.type(titleInput, 'Task A');
    await userEvent.click(addTaskBtn);
    await userEvent.type(titleInput, 'Task B');
    await userEvent.click(addTaskBtn);

    await userEvent.click(
      within(screen.getByRole('listitem', { name: 'Task A' })).getByRole(
        'button',
        { name: 'Delete task' },
      ),
    );
    await userEvent.click(
      within(screen.getByRole('listitem', { name: 'Task B' })).getByRole(
        'button',
        { name: 'Delete task' },
      ),
    );
    expect(await screen.findByText('Deleted "Task B"')).toBeInTheDocument();

    // Jump past the auto‑hide duration: the snackbar now offers the
    // previous (older) undo instead of disappearing.
    await act(async () => {
      vi.advanceTimersByTime(6000);
    });
    expect(screen.getByText('Deleted "Task A"')).toBeInTheDocument();
    expect(screen.queryByText('Task B')).not.toBeInTheDocument();

    // The auto‑hide finalized Task B's deletion: undo now restores the
    // remaining (older) deletion…
    await userEvent.click(screen.getByRole('button', { name: /^undo$/i }));
    expect(screen.getByText('Task A')).toBeInTheDocument();
    // …while Task B stays gone.
    expect(screen.queryByText('Task B')).not.toBeInTheDocument();
    // The stack is empty again: the snackbar closes.
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: /^undo$/i }),
      ).not.toBeInTheDocument(),
    );
  } finally {
    vi.useRealTimers();
  }
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
