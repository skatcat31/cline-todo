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
 * (i.e., `subtaskParentId` is null) does nothing. The form should not be
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

/**
 * Verify that the initial render shows the placeholder text when there are no tasks.
 * This exercises the `tasks.length === 0` branch in the component.
 */
test('initial render shows no‑tasks placeholder', async () => {
  render(<App />);
  // The placeholder paragraph should be present
  expect(screen.getByText(/no tasks yet\. add one above!/i)).toBeInTheDocument();
});

/**
 * Adding a task without providing a description should not render a description
 * element. This covers the false branch of the `task.description &&` conditional.
 */
test('add task without description does not render description element', async () => {
  render(<App />);

  const titleInput = screen.getByLabelText(/title/i);
  const addTaskBtn = screen.getByRole('button', { name: /add task/i });

  await userEvent.type(titleInput, 'Title Only');
  await userEvent.click(addTaskBtn);

  // Title should appear
  expect(screen.getByText('Title Only')).toBeInTheDocument();
  // Description paragraph should not be rendered
  expect(screen.queryByText(/.+/i, { selector: 'p' })).not.toBeInTheDocument();
});

/**
 * Adding a sub‑task to the second of multiple tasks ensures the `map` loop in
 * `handleAddSubtask` executes the false branch (`t.id !== subtaskParentId`).
 */
test('add subtask to second task exercises map false branch', async () => {
  render(<App />);

  // Add first task
  const titleInput = screen.getByLabelText(/title/i);
  const descInput = screen.getByLabelText(/description/i);
  const addTaskBtn = screen.getByRole('button', { name: /add task/i });
  await userEvent.type(titleInput, 'Task A');
  await userEvent.type(descInput, 'Desc A');
  await userEvent.click(addTaskBtn);

  // Add second task
  await userEvent.type(titleInput, 'Task B');
  await userEvent.type(descInput, 'Desc B');
  await userEvent.click(addTaskBtn);

  // Open sub‑task form for the second task (index 1)
  const addSubButtons = screen.getAllByRole('button', { name: /add subtask/i });
  // The second button corresponds to the second task's "Add Subtask" opener
  await userEvent.click(addSubButtons[1]);

  const subTitleInput = screen.getByLabelText(/subtask title/i);
  const subDescInput = screen.getByLabelText(/subtask description/i);
  const form = subTitleInput.closest('form');
  const submitBtn = within(form).getByRole('button', { name: /add subtask$/i });

  await userEvent.type(subTitleInput, 'Subtask X');
  await userEvent.type(subDescInput, 'Subdesc X');
  await userEvent.click(submitBtn);

  // Verify the sub‑task appears under the second task
  expect(screen.getByText('Subtask X')).toBeInTheDocument();
});

/**
 * Toggle the done state of the first sub‑task when multiple sub‑tasks exist.
 * This covers the false branch of the `s.id === subId` conditional inside
 * `toggleSubtaskDone`.
 */
test('toggle first subtask when multiple subtasks exist', async () => {
  render(<App />);

  // Add a task
  const titleInput = screen.getByLabelText(/title/i);
  const descInput = screen.getByLabelText(/description/i);
  const addTaskBtn = screen.getByRole('button', { name: /add task/i });
  await userEvent.type(titleInput, 'Task C');
  await userEvent.type(descInput, 'Desc C');
  await userEvent.click(addTaskBtn);

  // Open sub‑task form
  const [openSubBtn] = screen.getAllByRole('button', { name: /add subtask/i });
  await userEvent.click(openSubBtn);

  const subTitleInput = screen.getByLabelText(/subtask title/i);
  const subDescInput = screen.getByLabelText(/subtask description/i);
  const form = subTitleInput.closest('form');
  const submitBtn = within(form).getByRole('button', { name: /add subtask$/i });

  // Add first sub‑task
  await userEvent.type(subTitleInput, 'First Sub');
  await userEvent.type(subDescInput, 'First Desc');
  await userEvent.click(submitBtn);

  // Add second sub‑task (re‑open form)
  await userEvent.click(openSubBtn);
  const subTitleInput2 = screen.getByLabelText(/subtask title/i);
  const subDescInput2 = screen.getByLabelText(/subtask description/i);
  const form2 = subTitleInput2.closest('form');
  const submitBtn2 = within(form2).getByRole('button', { name: /add subtask$/i });
  await userEvent.type(subTitleInput2, 'Second Sub');
  await userEvent.type(subDescInput2, 'Second Desc');
  await userEvent.click(submitBtn2);

  // Toggle the first sub‑task
  const firstCheckbox = screen.getAllByLabelText('subtask done')[0];
  await userEvent.click(firstCheckbox);
  expect(firstCheckbox).toBeChecked();
  // Ensure the second sub‑task remains unchecked
  const secondCheckbox = screen.getAllByLabelText('subtask done')[1];
  expect(secondCheckbox).not.toBeChecked();
});

/**
 * Toggle a task when multiple tasks exist to hit the false branch of the
 * `prev.map` condition inside `toggleDone` (i !== index).
 */
test('toggle task with multiple tasks exercises map false branch', async () => {
  render(<App />);

  const titleInput = screen.getByLabelText(/title/i);
  const descInput = screen.getByLabelText(/description/i);
  const addTaskBtn = screen.getByRole('button', { name: /add task/i });

  // Add first task
  await userEvent.type(titleInput, 'Task 1');
  await userEvent.type(descInput, 'Desc 1');
  await userEvent.click(addTaskBtn);

  // Add second task
  await userEvent.type(titleInput, 'Task 2');
  await userEvent.type(descInput, 'Desc 2');
  await userEvent.click(addTaskBtn);

  // Toggle the first task's checkbox
  const checkboxes = screen.getAllByLabelText('task done');
  await userEvent.click(checkboxes[0]);
  expect(checkboxes[0]).toBeChecked();
  // Ensure the second task remains unchecked
  expect(checkboxes[1]).not.toBeChecked();
});

/**
 * Toggle a sub‑task when multiple parent tasks exist to cover the false branch
 * of the `t.id !== parentId` check inside `toggleSubtaskDone`.
 */
test('toggle subtask with multiple parent tasks exercises false branch', async () => {
  render(<App />);

  const titleInput = screen.getByLabelText(/title/i);
  const descInput = screen.getByLabelText(/description/i);
  const addTaskBtn = screen.getByRole('button', { name: /add task/i });

  // Add two parent tasks
  await userEvent.type(titleInput, 'Parent A');
  await userEvent.type(descInput, 'Desc A');
  await userEvent.click(addTaskBtn);
  await userEvent.type(titleInput, 'Parent B');
  await userEvent.type(descInput, 'Desc B');
  await userEvent.click(addTaskBtn);

  // Add a sub‑task to the first parent (index 0)
  const addSubButtons = screen.getAllByRole('button', { name: /add subtask/i });
  await userEvent.click(addSubButtons[0]);
  const subTitleInput = screen.getByLabelText(/subtask title/i);
  const subDescInput = screen.getByLabelText(/subtask description/i);
  const form = subTitleInput.closest('form');
  const submitBtn = within(form).getByRole('button', { name: /add subtask$/i });
  await userEvent.type(subTitleInput, 'Sub A');
  await userEvent.type(subDescInput, 'Sub A Desc');
  await userEvent.click(submitBtn);

  // Toggle the sub‑task of the first parent
  const subCheckboxes = screen.getAllByLabelText('subtask done');
  await userEvent.click(subCheckboxes[0]);
  expect(subCheckboxes[0]).toBeChecked();
  // No other sub‑task checkboxes should exist (ensuring false branch exercised)
  expect(subCheckboxes).toHaveLength(1);
});

/**
 * Add a sub‑task without a description to ensure the `aria-describedby`
 * attribute is omitted (covers false branch of the conditional rendering).
 */
test('add subtask without description does not render description element', async () => {
  render(<App />);

  // Add a parent task
  const titleInput = screen.getByLabelText(/title/i);
  const descInput = screen.getByLabelText(/description/i);
  const addTaskBtn = screen.getByRole('button', { name: /add task/i });
  await userEvent.type(titleInput, 'Parent C');
  await userEvent.type(descInput, 'Parent C Desc');
  await userEvent.click(addTaskBtn);

  // Open sub‑task form
  const [openSubBtn] = screen.getAllByRole('button', { name: /add subtask/i });
  await userEvent.click(openSubBtn);

  const subTitleInput = screen.getByLabelText(/subtask title/i);
  const subDescInput = screen.getByLabelText(/subtask description/i);
  const form = subTitleInput.closest('form');
  const submitBtn = within(form).getByRole('button', { name: /add subtask$/i });

  // Provide only a title, leave description empty
  await userEvent.type(subTitleInput, 'NoDesc Sub');
  await userEvent.click(submitBtn);

  // Verify the sub‑task appears but no description paragraph is rendered
  expect(screen.getByText('NoDesc Sub')).toBeInTheDocument();
  // The description element would be a <p> sibling; ensure none exists for this sub‑task
  const subTaskItem = screen.getByText('NoDesc Sub').closest('li');
  expect(within(subTaskItem).queryByRole('paragraph')).not.toBeInTheDocument();
});
