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

/**
 * Test that the "done" toggles for both tasks and sub‑tasks work correctly.
 * It verifies that clicking the checkbox updates the internal state, the UI
 * reflects the change (checkbox is checked and the title receives a line‑through),
 * and that the same behavior applies to a sub‑task.
 */
test('toggle task and subtask done works correctly', async () => {
  render(<App />);

  // ---- Add a task -------------------------------------------------------
  const titleInput = screen.getByLabelText(/title/i);
  const descInput = screen.getByLabelText(/description/i);
  const addTaskBtn = screen.getByRole('button', { name: /add task/i });
  await userEvent.type(titleInput, 'Task 2');
  await userEvent.type(descInput, 'Another description');
  await userEvent.click(addTaskBtn);

  // Verify task rendered
  expect(screen.getByText('Task 2')).toBeInTheDocument();

  // ---- Toggle task done -------------------------------------------------
  const taskCheckbox = screen.getByLabelText('task done');
  await userEvent.click(taskCheckbox);
  expect(taskCheckbox).toBeChecked();
  // The task title should now have a line‑through style
  const taskTitle = screen.getByText('Task 2');
  expect(taskTitle).toHaveStyle('text-decoration: line-through');

  // ---- Open sub‑task form ----------------------------------------------
  const [openSubtaskBtn] = screen.getAllByRole('button', { name: /add subtask/i });
  await userEvent.click(openSubtaskBtn);
  const subTitleInput = screen.getByLabelText(/subtask title/i);
  const subDescInput = screen.getByLabelText(/subtask description/i);
  const form = subTitleInput.closest('form');
  const submitSubtaskBtn = within(form).getByRole('button', { name: /add subtask$/i });

  // ---- Add sub‑task -----------------------------------------------------
  await userEvent.type(subTitleInput, 'Subtask B');
  await userEvent.type(subDescInput, 'Desc');
  await userEvent.click(submitSubtaskBtn);

  // Verify sub‑task appears
  expect(screen.getByText('Subtask B')).toBeInTheDocument();

  // ---- Toggle sub‑task done --------------------------------------------
  const subCheckbox = screen.getByLabelText('subtask done');
  await userEvent.click(subCheckbox);
  expect(subCheckbox).toBeChecked();
  const subTitle = screen.getByText('Subtask B');
  expect(subTitle).toHaveStyle('text-decoration: line-through');
});

/**
 * Verify that validation logic prevents adding a task when the title is empty.
 * The UI should simply ignore the submit action and no new task element should appear.
 */
test('add task with empty title does not create a task', async () => {
  render(<App />);

  const titleInput = screen.getByLabelText(/title/i);
  const descInput = screen.getByLabelText(/description/i);
  const addTaskBtn = screen.getByRole('button', { name: /add task/i });

  // Leave title empty, provide a description, and click Add Task
  await userEvent.type(descInput, 'Some description');
  await userEvent.click(addTaskBtn);

  // No task should be rendered – there should be no list items at all
  expect(screen.queryAllByRole('listitem')).toHaveLength(0);
});

/**
 * Verify that attempting to add a sub‑task without first selecting a parent
 * (i.e., `subtaskParentIdx` is null) does nothing. The form should not be
 * rendered and no sub‑task should be added.
 */
test('add subtask without selecting parent does nothing', async () => {
  render(<App />);

  // Directly try to submit the sub‑task form without opening it first.
  // The sub‑task form is not in the DOM, so we simulate the situation by
  // attempting to locate its fields – they should be absent.
  expect(screen.queryByLabelText(/subtask title/i)).not.toBeInTheDocument();
});

/**
 * Verify that an empty sub‑task title prevents the sub‑task from being added.
 * The parent task is selected, the form opens, but submitting with an empty
 * title should leave the sub‑task list unchanged.
 */
test('add subtask with empty title does not create subtask', async () => {
  render(<App />);

  // First add a task so we have a parent.
  const titleInput = screen.getByLabelText(/title/i);
  const descInput = screen.getByLabelText(/description/i);
  const addTaskBtn = screen.getByRole('button', { name: /add task/i });
  await userEvent.type(titleInput, 'Parent Task');
  await userEvent.type(descInput, 'Parent Desc');
  await userEvent.click(addTaskBtn);

  // Open sub‑task form for the newly added task.
  const [openSubtaskBtn] = screen.getAllByRole('button', { name: /add subtask/i });
  await userEvent.click(openSubtaskBtn);

  // The form is now visible – leave title empty and attempt to submit.
  const subDescInput = screen.getByLabelText(/subtask description/i);
  await userEvent.type(subDescInput, 'Desc');
  const form = subDescInput.closest('form');
  const submitBtn = within(form).getByRole('button', { name: /add subtask$/i });
  await userEvent.click(submitBtn);

  // No sub‑task should appear – there should be no subtask checkboxes.
  expect(screen.queryAllByLabelText('subtask done')).toHaveLength(0);
});
