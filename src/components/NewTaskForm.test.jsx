import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { expect, test, vi } from 'vitest';
import { createRef } from 'react';
import NewTaskForm from './NewTaskForm.jsx';

// Unit tests for the extracted NewTaskForm component: it owns its draft
// state and reports a finished task to the parent via onAddTask.

test('renders the title and description fields plus the submit button', () => {
  render(<NewTaskForm onAddTask={vi.fn()} />);
  expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
  expect(screen.getByLabelText('Description')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /add task/i })).toBeInTheDocument();
});

test('reports the entered title and description and clears both fields', async () => {
  const onAddTask = vi.fn();
  render(<NewTaskForm onAddTask={onAddTask} />);
  await userEvent.type(screen.getByLabelText(/title/i), 'Buy milk');
  await userEvent.type(screen.getByLabelText('Description'), '2 liters');
  await userEvent.click(screen.getByRole('button', { name: /add task/i }));
  expect(onAddTask).toHaveBeenCalledTimes(1);
  expect(onAddTask).toHaveBeenCalledWith({
    title: 'Buy milk',
    description: '2 liters',
  });
  // The draft fields are reset so the form can be used again immediately.
  expect(screen.getByLabelText(/title/i)).toHaveValue('');
  expect(screen.getByLabelText('Description')).toHaveValue('');
});

test('does not report a task when the title is blank', async () => {
  const onAddTask = vi.fn();
  render(<NewTaskForm onAddTask={onAddTask} />);
  await userEvent.type(screen.getByLabelText('Description'), 'no title');
  await userEvent.click(screen.getByRole('button', { name: /add task/i }));
  expect(onAddTask).not.toHaveBeenCalled();
});

test('receives the title input element via titleFieldRef', () => {
  const ref = createRef();
  render(<NewTaskForm onAddTask={vi.fn()} titleFieldRef={ref} />);
  expect(ref.current).toBe(screen.getByLabelText(/title/i));
});
