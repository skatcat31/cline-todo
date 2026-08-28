import App from './App';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// Compatibility layer for jest-dom with Vitest
import '@testing-library/jest-dom/vitest';
import { test, expect, vi } from 'vitest';

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
  const [openSubtaskBtn] = screen.getAllByRole('button', {
    name: /add subtask/i,
  });
  await userEvent.click(openSubtaskBtn);

  // Sub‑task form fields become visible within the newly rendered form.
  const subTitleInput = screen.getByLabelText(/subtask title/i);
  const subDescInput = screen.getByLabelText(/subtask description/i);
  // Locate the submit button inside the same form as the title input.
  const form = subTitleInput.closest('form');
  const submitSubtaskBtn = within(form).getByRole('button', {
    name: /add subtask$/i,
  });

  // ---- Add a sub‑task ---------------------------------------------------
  await userEvent.type(subTitleInput, 'Subtask A');
  await userEvent.type(subDescInput, 'Subtask description');
  await userEvent.click(submitSubtaskBtn);

  // New sub‑task should appear
  expect(screen.getByText('Subtask A')).toBeInTheDocument();

  // Sub‑task form should be removed (closed)
  expect(screen.queryByLabelText(/subtask title/i)).not.toBeInTheDocument();

  // Focus should be on the newly added checkbox (aria-label "subtask done")
  const newCheckbox = await screen.findByRole('checkbox', {
    name: 'Subtask A',
  });
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
  const taskCheckbox = screen.getByRole('checkbox', { name: 'Task 2' });
  await userEvent.click(taskCheckbox);
  expect(taskCheckbox).toBeChecked();
  // The task title should now have a line‑through style
  const taskTitle = screen.getByText('Task 2');
  expect(taskTitle).toHaveStyle('text-decoration: line-through');

  // ---- Open sub‑task form ----------------------------------------------
  const [openSubtaskBtn] = screen.getAllByRole('button', {
    name: /add subtask/i,
  });
  await userEvent.click(openSubtaskBtn);
  const subTitleInput = screen.getByLabelText(/subtask title/i);
  const subDescInput = screen.getByLabelText(/subtask description/i);
  const form = subTitleInput.closest('form');
  const submitSubtaskBtn = within(form).getByRole('button', {
    name: /add subtask$/i,
  });

  // ---- Add sub‑task -----------------------------------------------------
  await userEvent.type(subTitleInput, 'Subtask B');
  await userEvent.type(subDescInput, 'Desc');
  await userEvent.click(submitSubtaskBtn);

  // Verify sub‑task appears
  expect(screen.getByText('Subtask B')).toBeInTheDocument();

  // ---- Toggle sub‑task done --------------------------------------------
  const subCheckbox = screen.getByRole('checkbox', { name: 'Subtask B' });
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
  const [openSubtaskBtn] = screen.getAllByRole('button', {
    name: /add subtask/i,
  });
  await userEvent.click(openSubtaskBtn);

  // The form is now visible – leave title empty and attempt to submit.
  const subDescInput = screen.getByLabelText(/subtask description/i);
  await userEvent.type(subDescInput, 'Desc');
  const form = subDescInput.closest('form');
  const submitBtn = within(form).getByRole('button', { name: /add subtask$/i });
  await userEvent.click(submitBtn);

  // No sub‑task should appear – there should be no subtask checkboxes.
  expect(screen.getAllByRole('checkbox')).toHaveLength(1);
});

/**
 * Verify that the initial render shows the placeholder text when there are no tasks.
 * This exercises the `tasks.length === 0` branch in the component.
 */
test('initial render shows no‑tasks placeholder', async () => {
  render(<App />);
  // The placeholder paragraph should be present
  expect(
    screen.getByText(/no tasks yet\. add one above!/i),
  ).toBeInTheDocument();
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
  // The task's row must not contain a description paragraph
  const taskItem = screen.getByText('Title Only').closest('li');
  expect(
    within(taskItem).queryByText(/.+/i, { selector: 'p' }),
  ).not.toBeInTheDocument();
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
 * Tasks are written to localStorage whenever they change.
 */
test('persists tasks to localStorage as they change', async () => {
  render(<App />);
  const titleInput = screen.getByLabelText(/^title/i);
  await userEvent.type(titleInput, 'Persisted task');
  await userEvent.click(screen.getByRole('button', { name: /add task/i }));
  const stored = JSON.parse(localStorage.getItem('tasks'));
  expect(stored).toHaveLength(1);
  expect(stored[0]).toMatchObject({
    title: 'Persisted task',
    description: '',
    done: false,
    subtasks: [],
  });
});

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
test('clear completed removes only the completed tasks', async () => {
  render(<App />);
  const titleInput = screen.getByLabelText(/^title/i);
  const addTaskBtn = screen.getByRole('button', { name: /add task/i });
  await userEvent.type(titleInput, 'Task A');
  await userEvent.click(addTaskBtn);
  await userEvent.type(titleInput, 'Task B');
  await userEvent.click(addTaskBtn);

  // Complete the first task – the "Clear completed" button appears
  await userEvent.click(screen.getByRole('checkbox', { name: 'Task A' }));
  const clearBtn = screen.getByRole('button', { name: /clear completed/i });
  await userEvent.click(clearBtn);

  expect(screen.queryByText('Task A')).not.toBeInTheDocument();
  expect(screen.getByText('Task B')).toBeInTheDocument();
  // No completed tasks left -> the button is gone
  expect(
    screen.queryByRole('button', { name: /clear completed/i }),
  ).not.toBeInTheDocument();
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

  await userEvent.click(await screen.findByRole('button', { name: /^undo$/i }));
  expect(screen.getByText('Task A')).toBeInTheDocument();
  // The task must be back at its original position (before Task B).
  const items = screen.getAllByRole('listitem');
  expect(items[0]).toHaveAccessibleName('Task A');
  expect(items[1]).toHaveAccessibleName('Task B');
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
 * "Export tasks" downloads the list as a JSON file. jsdom does not implement
 * URL.createObjectURL or anchor navigation, so both are stubbed.
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
  try {
    await userEvent.click(screen.getByRole('button', { name: 'Export tasks' }));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const exported = JSON.parse(await createdBlob.text());
    expect(exported).toHaveLength(1);
    expect(exported[0]).toMatchObject({ title: 'Task A', done: false });
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
  } finally {
    clickSpy.mockRestore();
  }
});

/**
 * "Import tasks" replaces the current list with the (normalized) contents of
 * the chosen JSON file.
 */
test('imports tasks from a JSON file', async () => {
  render(<App />);
  // Pre‑populate so the test proves the import *replaces* the list.
  const titleInput = screen.getByLabelText(/^title/i);
  await userEvent.type(titleInput, 'Existing');
  await userEvent.click(screen.getByRole('button', { name: /add task/i }));

  const file = new File(
    [JSON.stringify([{ id: 'i1', title: 'Imported', done: true }])],
    'tasks.json',
    { type: 'application/json' },
  );
  await userEvent.upload(document.querySelector('input[type="file"]'), file);

  expect(await screen.findByText('Imported')).toBeInTheDocument();
  expect(screen.queryByText('Existing')).not.toBeInTheDocument();
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

/**
 * The app bar offers a light/dark toggle; the choice is persisted so a
 * "reload" keeps the selected color scheme.
 */
test('toggles the theme and persists the choice', async () => {
  render(<App />);
  const toggle = screen.getByRole('button', { name: 'Switch to dark mode' });
  await userEvent.click(toggle);

  expect(
    screen.getByRole('button', { name: 'Switch to light mode' }),
  ).toBeInTheDocument();
  expect(localStorage.getItem('todo-theme')).toBe('dark');
});

/**
 * An explicitly stored theme preference wins over the OS preference.
 */
test('uses the stored theme preference', () => {
  localStorage.setItem('todo-theme', 'dark');
  render(<App />);
  expect(
    screen.getByRole('button', { name: 'Switch to light mode' }),
  ).toBeInTheDocument();
});

/**
 * Without a stored preference the app follows the OS color-scheme setting.
 */
test('defaults to dark when the system prefers dark', () => {
  const originalMatchMedia = window.matchMedia;
  window.matchMedia = vi.fn().mockReturnValue({ matches: true });
  try {
    render(<App />);
    expect(
      screen.getByRole('button', { name: 'Switch to light mode' }),
    ).toBeInTheDocument();
  } finally {
    window.matchMedia = originalMatchMedia;
  }
});
