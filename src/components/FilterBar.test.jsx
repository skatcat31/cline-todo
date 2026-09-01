import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { expect, test, vi } from 'vitest';
import FilterBar from './FilterBar.jsx';
import { FILTERS } from '../utils/filters.js';

// Unit tests for the extracted FilterBar component: the filter buttons, the
// active-task counter and the "clear completed" action.

test('FILTERS exposes the three supported filters with their labels', () => {
  expect(FILTERS).toEqual([
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
  ]);
});

test('renders the three filter buttons and marks the active one', () => {
  render(
    <FilterBar
      filter="active"
      onFilterChange={vi.fn()}
      activeCount={1}
      totalCount={2}
      completedCount={1}
      onClearCompleted={vi.fn()}
    />,
  );
  expect(screen.getByRole('button', { name: 'All' })).not.toBePressed();
  expect(screen.getByRole('button', { name: 'Active' })).toBePressed();
  expect(screen.getByRole('button', { name: 'Completed' })).not.toBePressed();
});

test('reports each filter value when its button is clicked', async () => {
  const onFilterChange = vi.fn();
  render(
    <FilterBar
      filter="all"
      onFilterChange={onFilterChange}
      activeCount={1}
      totalCount={2}
      completedCount={0}
      onClearCompleted={vi.fn()}
    />,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Active' }));
  await userEvent.click(screen.getByRole('button', { name: 'Completed' }));
  expect(onFilterChange).toHaveBeenNthCalledWith(1, 'active');
  expect(onFilterChange).toHaveBeenNthCalledWith(2, 'completed');
});

test('shows the active-task counter with plural task wording', () => {
  render(
    <FilterBar
      filter="all"
      onFilterChange={vi.fn()}
      activeCount={3}
      totalCount={5}
      completedCount={0}
      onClearCompleted={vi.fn()}
    />,
  );
  expect(screen.getByText('3 of 5 tasks active')).toBeInTheDocument();
});

test('uses the singular task wording for a single task', () => {
  render(
    <FilterBar
      filter="all"
      onFilterChange={vi.fn()}
      activeCount={1}
      totalCount={1}
      completedCount={0}
      onClearCompleted={vi.fn()}
    />,
  );
  expect(screen.getByText('1 of 1 task active')).toBeInTheDocument();
});

test('hides the clear-completed button while no task is completed', () => {
  render(
    <FilterBar
      filter="all"
      onFilterChange={vi.fn()}
      activeCount={1}
      totalCount={1}
      completedCount={0}
      onClearCompleted={vi.fn()}
    />,
  );
  expect(
    screen.queryByRole('button', { name: /clear completed/i }),
  ).not.toBeInTheDocument();
});

test('offers clear-completed only for completed tasks and reports clicks', async () => {
  const onClearCompleted = vi.fn();
  render(
    <FilterBar
      filter="all"
      onFilterChange={vi.fn()}
      activeCount={1}
      totalCount={3}
      completedCount={2}
      onClearCompleted={onClearCompleted}
    />,
  );
  await userEvent.click(
    screen.getByRole('button', { name: /clear completed/i }),
  );
  expect(onClearCompleted).toHaveBeenCalledTimes(1);
});

test('toggles the due‑date sort off by default and reports the new value', async () => {
  const onSortChange = vi.fn();
  render(
    <FilterBar
      filter="all"
      onFilterChange={vi.fn()}
      sort="none"
      onSortChange={onSortChange}
      activeCount={1}
      totalCount={2}
      completedCount={0}
      onClearCompleted={vi.fn()}
    />,
  );
  const toggle = screen.getByRole('button', { name: 'Sort by due date' });
  expect(toggle).not.toBePressed();
  await userEvent.click(toggle);
  expect(onSortChange).toHaveBeenCalledWith('due');
});

test('marks the due‑date sort as pressed while it is selected', () => {
  render(
    <FilterBar
      filter="all"
      onFilterChange={vi.fn()}
      sort="due"
      onSortChange={vi.fn()}
      activeCount={1}
      totalCount={2}
      completedCount={0}
      onClearCompleted={vi.fn()}
    />,
  );
  expect(
    screen.getByRole('button', { name: 'Sort by due date' }),
  ).toBePressed();
});
