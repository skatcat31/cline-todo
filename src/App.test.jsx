import React from 'react';
import App from './App';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// Compatibility layer for jest-dom with Vitest
import '@testing-library/jest-dom/vitest';
import { test, expect } from 'vitest';

/**
 * Simple smoke test using ReactDOMServer to ensure the component renders
 * without throwing and contains key UI elements such as the "Add Task"
 * button and the "Add Subtask" button for a task.
 */
/**
 * Integration test covering the core user flows:
 *   1. Adding a new task.
 *   2. Opening the sub‑task form for that task.
 *   3. Adding a sub‑task.
 *   4. Verifying the sub‑task form closes, the new sub‑task appears, and
 *      focus moves to the newly created sub‑task checkbox.
 */
test('full task & subtask flow works correctly', async () => {
  render(<App />);

  // ---- Add a task -------------------------------------------------------
  const titleInput = screen.getByLabelText(/title/i);
  const descInput = screen.getByLabelText(/description/i);
  const addTaskBtn = screen.getByRole('button', { name: /add task/i });

  await userEvent.type(titleInput, 'Task 1');
  await userEvent.type(descInput, 'Task description');
  await userEvent.click(addTaskBtn);

  // Task should now be rendered
  expect(screen.getByText('Task 1')).toBeInTheDocument();
  expect(screen.getByText('Task description')).toBeInTheDocument();

  // ---- Open sub‑task form ----------------------------------------------
  // There are two "Add Subtask" buttons: one to open the form and one to submit.
  // Grab the first one (the button element, not the submit button) to open the form.
  const [openSubtaskBtn] = screen.getAllByRole('button', { name: /add subtask/i });
  await userEvent.click(openSubtaskBtn);

  // Sub‑task form fields become visible within the newly rendered form.
  const subTitleInput = screen.getByLabelText(/subtask title/i);
  const subDescInput = screen.getByLabelText(/subtask description/i);
  // Locate the submit button inside the same form as the title input.
  const form = subTitleInput.closest('form');
  const submitSubtaskBtn = within(form).getByRole('button', { name: /add subtask$/i });

  // ---- Add a sub‑task ---------------------------------------------------
  await userEvent.type(subTitleInput, 'Subtask A');
  await userEvent.type(subDescInput, 'Subtask description');
  await userEvent.click(submitSubtaskBtn);

  // New sub‑task should appear
  expect(screen.getByText('Subtask A')).toBeInTheDocument();

  // Sub‑task form should be removed (closed)
  expect(screen.queryByLabelText(/subtask title/i)).not.toBeInTheDocument();

  // Focus should be on the newly added checkbox (aria-label "subtask done")
  const newCheckbox = await screen.findByLabelText('subtask done');
  await waitFor(() => {
    expect(newCheckbox).toHaveFocus();
  });
});
