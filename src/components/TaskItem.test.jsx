import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { expect, test, vi } from 'vitest';
import TaskItem from './TaskItem.jsx';

// Unit tests for TaskItem's focusToken contract: a changing, non-null token
// moves focus to this task's checkbox (used by the app after a delete).
// The full delete flow is covered by App.test.jsx.

const task = {
  id: 't-1',
  title: 'Task A',
  description: 'some details',
  done: false,
  subtasks: [],
};

// Only the prop under test is real; every handler is a no-op stub.
function renderTaskItem(props = {}) {
  return render(
    <TaskItem
      task={task}
      onToggleDone={vi.fn()}
      onDelete={vi.fn()}
      onEdit={vi.fn()}
      onAddSubtask={vi.fn()}
      onToggleSubtask={vi.fn()}
      onDeleteSubtask={vi.fn()}
      onEditSubtask={vi.fn()}
      onMoveUp={vi.fn()}
      onMoveDown={vi.fn()}
      {...props}
    />,
  );
}

test('focuses its checkbox when a non-null focusToken is given', () => {
  renderTaskItem({ focusToken: 1 });
  expect(screen.getByRole('checkbox', { name: 'Task A' })).toHaveFocus();
});

test('does not steal focus when focusToken is null', () => {
  renderTaskItem({ focusToken: null });
  expect(screen.getByRole('checkbox', { name: 'Task A' })).not.toHaveFocus();
});

test('a changed token re-triggers focus, an unchanged token does not', () => {
  const { rerender } = renderTaskItem({ focusToken: 42 });
  expect(screen.getByRole('checkbox', { name: 'Task A' })).toHaveFocus();

  // Same token again: the effect must not re-run (focus stays where it is,
  // no observable side effect either way - assert via a fresh render below).
  rerender(
    <TaskItem
      task={task}
      onToggleDone={vi.fn()}
      onDelete={vi.fn()}
      onEdit={vi.fn()}
      onAddSubtask={vi.fn()}
      onToggleSubtask={vi.fn()}
      onDeleteSubtask={vi.fn()}
      onEditSubtask={vi.fn()}
      focusToken={42}
    />,
  );
  expect(screen.getByRole('checkbox', { name: 'Task A' })).toHaveFocus();

  // A new token must focus the checkbox again.
  rerender(
    <TaskItem
      task={task}
      onToggleDone={vi.fn()}
      onDelete={vi.fn()}
      onEdit={vi.fn()}
      onAddSubtask={vi.fn()}
      onToggleSubtask={vi.fn()}
      onDeleteSubtask={vi.fn()}
      onEditSubtask={vi.fn()}
      focusToken={43}
    />,
  );
  expect(screen.getByRole('checkbox', { name: 'Task A' })).toHaveFocus();
});

test('reports the move clicks while both directions are enabled', async () => {
  const onMoveUp = vi.fn();
  const onMoveDown = vi.fn();
  renderTaskItem({
    onMoveUp,
    onMoveDown,
    canMoveUp: true,
    canMoveDown: true,
  });
  const up = screen.getByRole('button', { name: 'Move task up' });
  const down = screen.getByRole('button', { name: 'Move task down' });
  expect(up).toBeEnabled();
  expect(down).toBeEnabled();
  await userEvent.click(up);
  await userEvent.click(down);
  expect(onMoveUp).toHaveBeenCalledTimes(1);
  expect(onMoveDown).toHaveBeenCalledTimes(1);
});

test('disables the move buttons at the list edges', () => {
  renderTaskItem({
    onMoveUp: vi.fn(),
    onMoveDown: vi.fn(),
    canMoveUp: false,
    canMoveDown: false,
  });
  expect(screen.getByRole('button', { name: 'Move task up' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Move task down' })).toBeDisabled();
});

// Due‑date display: the badge text comes from the pure dueBadge helper
// (dates.test.js covers it); here we only check TaskItem renders it.

test('shows a due date badge for tasks with a due date', () => {
  renderTaskItem({ task: { ...task, due: '2999-05-01' } });
  expect(screen.getByText('Due May 1, 2999')).toBeInTheDocument();
});

test('flags an unfinished task past its due date as overdue', () => {
  renderTaskItem({ task: { ...task, due: '2000-01-01' } });
  expect(screen.getByText('Overdue (due Jan 1, 2000)')).toBeInTheDocument();
});

test('does not flag a done task whose due date has passed', () => {
  renderTaskItem({ task: { ...task, due: '2000-01-01', done: true } });
  expect(screen.getByText('Due Jan 1, 2000')).toBeInTheDocument();
  expect(screen.queryByText(/overdue/i)).not.toBeInTheDocument();
});

test('shows no due date badge without a due date', () => {
  renderTaskItem();
  expect(screen.queryByText(/^due /i)).not.toBeInTheDocument();
  expect(screen.queryByText(/overdue/i)).not.toBeInTheDocument();
});

test('the edit form pre-fills, changes and reports the due date', async () => {
  const onEdit = vi.fn();
  renderTaskItem({
    onEdit,
    task: { ...task, due: '2026-09-10' },
  });
  await userEvent.click(screen.getByRole('button', { name: 'Edit task' }));
  const dueField = screen.getByLabelText('Edit Due Date (optional)');
  expect(dueField).toHaveValue('2026-09-10');
  fireEvent.change(dueField, { target: { value: '2026-12-31' } });
  await userEvent.click(screen.getByRole('button', { name: 'Save Task' }));
  expect(onEdit).toHaveBeenCalledWith('t-1', {
    title: 'Task A',
    description: 'some details',
    due: '2026-12-31',
  });
});
