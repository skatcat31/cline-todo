// Task & subtask management: toggling, deleting, editing, focus handling and Escape.
import App from './App';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// Compatibility layer for jest-dom with Vitest
import '@testing-library/jest-dom/vitest';
import { test, expect } from 'vitest';

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
  const submitBtn2 = within(form2).getByRole('button', {
    name: /add subtask$/i,
  });
  await userEvent.type(subTitleInput2, 'Second Sub');
  await userEvent.type(subDescInput2, 'Second Desc');
  await userEvent.click(submitBtn2);

  // Toggle the first sub‑task
  const firstCheckbox = screen.getByRole('checkbox', { name: 'First Sub' });
  await userEvent.click(firstCheckbox);
  expect(firstCheckbox).toBeChecked();
  // Ensure the second sub‑task remains unchecked
  const secondCheckbox = screen.getByRole('checkbox', { name: 'Second Sub' });
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
  const firstCheckbox = screen.getByRole('checkbox', { name: 'Task 1' });
  await userEvent.click(firstCheckbox);
  expect(firstCheckbox).toBeChecked();
  // Ensure the second task remains unchecked
  expect(screen.getByRole('checkbox', { name: 'Task 2' })).not.toBeChecked();
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
  const subCheckbox = screen.getByRole('checkbox', { name: 'Sub A' });
  await userEvent.click(subCheckbox);
  expect(subCheckbox).toBeChecked();
  // The subtask should exist under exactly one parent (false branch exercised)
  expect(screen.getAllByText('Sub A')).toHaveLength(1);
});

/**
 * Deleting a task removes it from the list while leaving other tasks intact.
 */
test('deleting a task removes it from the list', async () => {
  render(<App />);

  const titleInput = screen.getByLabelText(/title/i);
  const descInput = screen.getByLabelText(/description/i);
  const addTaskBtn = screen.getByRole('button', { name: /add task/i });

  // Add two tasks
  await userEvent.type(titleInput, 'Task 1');
  await userEvent.type(descInput, 'Desc 1');
  await userEvent.click(addTaskBtn);
  await userEvent.type(titleInput, 'Task 2');
  await userEvent.type(descInput, 'Desc 2');
  await userEvent.click(addTaskBtn);

  expect(screen.getByText('Task 1')).toBeInTheDocument();
  expect(screen.getByText('Task 2')).toBeInTheDocument();

  // Delete the first task
  const deleteTaskBtns = screen.getAllByRole('button', {
    name: /delete task/i,
  });
  await userEvent.click(deleteTaskBtns[0]);

  expect(screen.queryByText('Task 1')).not.toBeInTheDocument();
  expect(screen.getByText('Task 2')).toBeInTheDocument();
});

/**
 * Deleting a subtask removes it from its parent task while leaving the parent
 * and sibling subtasks intact.
 */
test('deleting a subtask removes it from its parent task', async () => {
  render(<App />);

  const titleInput = screen.getByLabelText(/title/i);
  const descInput = screen.getByLabelText(/description/i);
  const addTaskBtn = screen.getByRole('button', { name: /add task/i });

  // Add a parent task
  await userEvent.type(titleInput, 'Parent Task');
  await userEvent.type(descInput, 'Parent Desc');
  await userEvent.click(addTaskBtn);

  // Add two subtasks to the parent
  const [openSubBtn] = screen.getAllByRole('button', { name: /add subtask/i });
  await userEvent.click(openSubBtn);
  let subTitleInput = screen.getByLabelText(/subtask title/i);
  let subDescInput = screen.getByLabelText(/subtask description/i);
  let form = subTitleInput.closest('form');
  let submitBtn = within(form).getByRole('button', { name: /add subtask$/i });
  await userEvent.type(subTitleInput, 'Sub 1');
  await userEvent.type(subDescInput, 'Sub 1 Desc');
  await userEvent.click(submitBtn);

  await userEvent.click(openSubBtn);
  subTitleInput = screen.getByLabelText(/subtask title/i);
  subDescInput = screen.getByLabelText(/subtask description/i);
  form = subTitleInput.closest('form');
  submitBtn = within(form).getByRole('button', { name: /add subtask$/i });
  await userEvent.type(subTitleInput, 'Sub 2');
  await userEvent.type(subDescInput, 'Sub 2 Desc');
  await userEvent.click(submitBtn);

  expect(screen.getByText('Sub 1')).toBeInTheDocument();
  expect(screen.getByText('Sub 2')).toBeInTheDocument();

  // Delete the first subtask
  const deleteSubBtns = screen.getAllByRole('button', {
    name: /delete subtask/i,
  });
  await userEvent.click(deleteSubBtns[0]);

  expect(screen.queryByText('Sub 1')).not.toBeInTheDocument();
  expect(screen.getByText('Sub 2')).toBeInTheDocument();
  // The parent task must remain
  expect(screen.getByText('Parent Task')).toBeInTheDocument();
});

/**
 * Deleting the last remaining task brings back the empty-state placeholder.
 */
test('deleting the last task shows the empty placeholder', async () => {
  render(<App />);

  const titleInput = screen.getByLabelText(/title/i);
  const descInput = screen.getByLabelText(/description/i);
  const addTaskBtn = screen.getByRole('button', { name: /add task/i });

  await userEvent.type(titleInput, 'Only Task');
  await userEvent.type(descInput, 'Only Desc');
  await userEvent.click(addTaskBtn);
  expect(screen.getByText('Only Task')).toBeInTheDocument();

  const [deleteTaskBtn] = screen.getAllByRole('button', {
    name: /delete task/i,
  });
  await userEvent.click(deleteTaskBtn);

  expect(screen.queryByText('Only Task')).not.toBeInTheDocument();
  expect(screen.getByText('No tasks yet. Add one above!')).toBeInTheDocument();
});

/**
 * Editing a task's title and description replaces the displayed values and
 * closes the inline edit form.
 */
test('editing a task updates its title and description', async () => {
  render(<App />);

  // ---- Add a task -------------------------------------------------------
  const titleInput = screen.getByLabelText(/^title/i);
  const descInput = screen.getByLabelText(/^description/i);
  const addTaskBtn = screen.getByRole('button', { name: /add task/i });

  await userEvent.type(titleInput, 'Task 1');
  await userEvent.type(descInput, 'Task description');
  await userEvent.click(addTaskBtn);

  expect(screen.getByText('Task 1')).toBeInTheDocument();
  expect(screen.getByText('Task description')).toBeInTheDocument();

  // ---- Open the inline edit form ----------------------------------------
  const [editTaskBtn] = screen.getAllByRole('button', { name: /edit task/i });
  await userEvent.click(editTaskBtn);

  const editTitleInput = screen.getByLabelText(/^edit title/i);
  const editDescInput = screen.getByLabelText(/^edit description/i);

  // Update the pre-filled values
  await userEvent.clear(editTitleInput);
  await userEvent.type(editTitleInput, 'Task 1 (edited)');
  await userEvent.clear(editDescInput);
  await userEvent.type(editDescInput, 'Updated description');

  // Save the changes
  const editForm = editTitleInput.closest('form');
  const saveTaskBtn = within(editForm).getByRole('button', {
    name: 'Save Task',
  });
  await userEvent.click(saveTaskBtn);

  // New values are shown and the edit form is closed
  expect(screen.getByText('Task 1 (edited)')).toBeInTheDocument();
  expect(screen.getByText('Updated description')).toBeInTheDocument();
  expect(screen.queryByLabelText(/^edit title/i)).not.toBeInTheDocument();
});

/**
 * Editing a subtask's title and description replaces the displayed values and
 * closes the inline edit form, while leaving the parent task untouched.
 */
test('editing a subtask updates its title and description', async () => {
  render(<App />);

  // ---- Add a parent task ------------------------------------------------
  const titleInput = screen.getByLabelText(/^title/i);
  const descInput = screen.getByLabelText(/^description/i);
  const addTaskBtn = screen.getByRole('button', { name: /add task/i });

  await userEvent.type(titleInput, 'Parent Task');
  await userEvent.type(descInput, 'Parent Desc');
  await userEvent.click(addTaskBtn);

  // ---- Add a subtask ----------------------------------------------------
  const [openSubBtn] = screen.getAllByRole('button', { name: /add subtask/i });
  await userEvent.click(openSubBtn);

  const subTitleInput = screen.getByLabelText(/^subtask title/i);
  const subDescInput = screen.getByLabelText(/^subtask description/i);
  const subForm = subTitleInput.closest('form');
  const submitSubBtn = within(subForm).getByRole('button', {
    name: /add subtask$/i,
  });

  await userEvent.type(subTitleInput, 'Sub 1');
  await userEvent.type(subDescInput, 'Sub 1 Desc');
  await userEvent.click(submitSubBtn);

  expect(screen.getByText('Sub 1')).toBeInTheDocument();
  expect(screen.getByText('Sub 1 Desc')).toBeInTheDocument();

  // ---- Open the inline edit form ----------------------------------------
  const [editSubBtn] = screen.getAllByRole('button', { name: /edit subtask/i });
  await userEvent.click(editSubBtn);

  const editSubTitleInput = screen.getByLabelText(/^edit subtask title/i);
  const editSubDescInput = screen.getByLabelText(/^edit subtask description/i);

  // Update the pre-filled values
  await userEvent.clear(editSubTitleInput);
  await userEvent.type(editSubTitleInput, 'Sub 1 (edited)');
  await userEvent.clear(editSubDescInput);
  await userEvent.type(editSubDescInput, 'Sub updated desc');

  // Save the changes
  const editSubForm = editSubTitleInput.closest('form');
  const saveSubBtn = within(editSubForm).getByRole('button', {
    name: 'Save Subtask',
  });
  await userEvent.click(saveSubBtn);

  // New values are shown, the edit form is closed, and the parent remains
  expect(screen.getByText('Sub 1 (edited)')).toBeInTheDocument();
  expect(screen.getByText('Sub updated desc')).toBeInTheDocument();
  expect(
    screen.queryByLabelText(/^edit subtask title/i),
  ).not.toBeInTheDocument();
  expect(screen.getByText('Parent Task')).toBeInTheDocument();
});

/**
 * Deleting a task must not leave the keyboard focus on a removed element:
 * it moves to the task that now occupies the deleted task's position.
 */
test('keeps focus inside the list after deleting a task', async () => {
  render(<App />);
  const titleInput = screen.getByLabelText(/^title/i);
  const addTaskBtn = screen.getByRole('button', { name: /add task/i });
  await userEvent.type(titleInput, 'Task A');
  await userEvent.click(addTaskBtn);
  await userEvent.type(titleInput, 'Task B');
  await userEvent.click(addTaskBtn);

  const itemB = screen.getByRole('listitem', { name: 'Task B' });
  await userEvent.click(
    within(itemB).getByRole('button', { name: 'Delete task' }),
  );
  await waitFor(() => {
    expect(screen.getByRole('checkbox', { name: 'Task A' })).toHaveFocus();
  });
});

/**
 * Escape cancels the task edit form without saving (the title field is
 * focused when the form opens, so the key reaches the form's handler).
 */
test('Escape closes the task edit form', async () => {
  render(<App />);
  const titleInput = screen.getByLabelText(/^title/i);
  await userEvent.type(titleInput, 'Task A');
  await userEvent.click(screen.getByRole('button', { name: /add task/i }));

  const itemA = screen.getByRole('listitem', { name: 'Task A' });
  await userEvent.click(
    within(itemA).getByRole('button', { name: 'Edit task' }),
  );
  const editTitle = screen.getByLabelText(/^edit title/i);
  expect(editTitle).toHaveFocus();

  await userEvent.keyboard('{Escape}');
  expect(screen.queryByLabelText(/^edit title/i)).not.toBeInTheDocument();
  // The original title must be untouched.
  expect(screen.getByText('Task A')).toBeInTheDocument();
});

/**
 * Escape closes the "add subtask" form without creating a subtask.
 */
test('Escape closes the subtask form', async () => {
  render(<App />);
  const titleInput = screen.getByLabelText(/^title/i);
  await userEvent.type(titleInput, 'Task A');
  await userEvent.click(screen.getByRole('button', { name: /add task/i }));

  const itemA = screen.getByRole('listitem', { name: 'Task A' });
  await userEvent.click(
    within(itemA).getByRole('button', { name: 'Add subtask' }),
  );
  const subTitle = screen.getByLabelText(/subtask title/i);
  expect(subTitle).toHaveFocus();

  await userEvent.keyboard('{Escape}');
  expect(screen.queryByLabelText(/subtask title/i)).not.toBeInTheDocument();
  // No subtask must have been created.
  expect(
    screen.queryByRole('checkbox', { name: /sub/i }),
  ).not.toBeInTheDocument();
});

/**
 * Tasks with subtasks show "x of y subtask(s) done", which updates as
 * subtasks are completed.
 */
test('shows subtask progress that updates as subtasks are completed', async () => {
  render(<App />);
  const titleInput = screen.getByLabelText(/^title/i);
  await userEvent.type(titleInput, 'Task A');
  await userEvent.click(screen.getByRole('button', { name: /add task/i }));

  // Add two subtasks
  let itemA = screen.getByRole('listitem', { name: 'Task A' });
  await userEvent.click(
    within(itemA).getByRole('button', { name: 'Add subtask' }),
  );
  let subTitleInput = screen.getByLabelText(/subtask title/i);
  await userEvent.type(subTitleInput, 'Sub 1');
  let subtaskForm = subTitleInput.closest('form');
  await userEvent.click(
    within(subtaskForm).getByRole('button', { name: /add subtask$/i }),
  );
  expect(screen.getByText('0 of 1 subtask done')).toBeInTheDocument();

  itemA = screen.getByRole('listitem', { name: 'Task A' });
  await userEvent.click(
    within(itemA).getByRole('button', { name: 'Add subtask' }),
  );
  subTitleInput = screen.getByLabelText(/subtask title/i);
  await userEvent.type(subTitleInput, 'Sub 2');
  subtaskForm = subTitleInput.closest('form');
  await userEvent.click(
    within(subtaskForm).getByRole('button', { name: /add subtask$/i }),
  );
  expect(screen.getByText('0 of 2 subtasks done')).toBeInTheDocument();

  // Complete one subtask
  await userEvent.click(screen.getByRole('checkbox', { name: 'Sub 1' }));
  expect(screen.getByText('1 of 2 subtasks done')).toBeInTheDocument();
});
