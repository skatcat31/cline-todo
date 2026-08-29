import { render, screen } from '@testing-library/react';
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
