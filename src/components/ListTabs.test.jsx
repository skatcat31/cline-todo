// Unit tests for the extracted ListTabs component: the tabs, the
// "New list" button, the list options menu and the rename/delete dialogs.
//
// MUI keeps closed dialogs mounted for the duration of their exit
// transition, so "closed" assertions use waitFor (as in the App tests).
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { expect, test, vi } from 'vitest';
import ListTabs from './ListTabs.jsx';

// Two lists, the second one active, the first one holding two tasks so the
// delete dialog can show a count.
const lists = [
  {
    id: 'l1',
    name: 'To-Do',
    tasks: [
      { id: '1', title: 'A' },
      { id: '2', title: 'B' },
    ],
  },
  { id: 'l2', name: 'Work', tasks: [] },
];
const defaultProps = {
  lists,
  activeListId: 'l2',
  onSelect: vi.fn(),
  onAdd: vi.fn(),
  onRename: vi.fn(),
  onDelete: vi.fn(),
};

test('renders one tab per list and marks the active one', () => {
  render(<ListTabs {...defaultProps} />);
  expect(screen.getByRole('tab', { name: 'To-Do' })).toHaveAttribute(
    'aria-selected',
    'false',
  );
  expect(screen.getByRole('tab', { name: 'Work' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

test('selects a list when its tab is clicked', async () => {
  const onSelect = vi.fn();
  render(<ListTabs {...defaultProps} onSelect={onSelect} />);
  await userEvent.click(screen.getByRole('tab', { name: 'To-Do' }));
  expect(onSelect).toHaveBeenCalledWith('l1');
});

test('creates a new list from the "New list" dialog', async () => {
  const onAdd = vi.fn();
  render(<ListTabs {...defaultProps} onAdd={onAdd} />);
  await userEvent.click(screen.getByRole('button', { name: 'New list' }));
  expect(
    await screen.findByRole('dialog', { name: 'New list' }),
  ).toBeInTheDocument();
  await userEvent.type(screen.getByLabelText('List name'), 'Home');
  await userEvent.click(screen.getByRole('button', { name: 'Create list' }));
  expect(onAdd).toHaveBeenCalledWith('Home');
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  );
});

test('refuses to create a list with a blank name and can be cancelled', async () => {
  const onAdd = vi.fn();
  render(<ListTabs {...defaultProps} onAdd={onAdd} />);
  await userEvent.click(screen.getByRole('button', { name: 'New list' }));
  await screen.findByRole('dialog', { name: 'New list' });
  // A blank name cannot be submitted…
  expect(screen.getByRole('button', { name: 'Create list' })).toBeDisabled();
  await userEvent.type(screen.getByLabelText('List name'), '   ');
  // …nor can a name made of whitespace only.
  expect(screen.getByRole('button', { name: 'Create list' })).toBeDisabled();
  // Cancelling closes the dialog without creating anything.
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  );
  expect(onAdd).not.toHaveBeenCalled();
});

test('renames the active list from the options menu', async () => {
  const onRename = vi.fn();
  render(<ListTabs {...defaultProps} onRename={onRename} />);
  await userEvent.click(screen.getByRole('button', { name: 'List options' }));
  await userEvent.click(
    await screen.findByRole('menuitem', { name: 'Rename list' }),
  );
  await screen.findByRole('dialog', { name: 'Rename list' });
  // The input is pre-filled with the active list's current name.
  expect(screen.getByLabelText('List name')).toHaveValue('Work');
  await userEvent.clear(screen.getByLabelText('List name'));
  await userEvent.type(screen.getByLabelText('List name'), 'Home');
  await userEvent.click(screen.getByRole('button', { name: 'Rename list' }));
  expect(onRename).toHaveBeenCalledWith('l2', 'Home');
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  );
});

test('cancelling the rename dialog does not rename the list', async () => {
  const onRename = vi.fn();
  render(<ListTabs {...defaultProps} onRename={onRename} />);
  await userEvent.click(screen.getByRole('button', { name: 'List options' }));
  await userEvent.click(
    await screen.findByRole('menuitem', { name: 'Rename list' }),
  );
  await screen.findByRole('dialog', { name: 'Rename list' });
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  );
  expect(onRename).not.toHaveBeenCalled();
});

test("shows the active list's task count in the delete dialog", async () => {
  const onDelete = vi.fn();
  render(<ListTabs {...defaultProps} activeListId="l1" onDelete={onDelete} />);
  await userEvent.click(screen.getByRole('button', { name: 'List options' }));
  await userEvent.click(
    await screen.findByRole('menuitem', { name: 'Delete list' }),
  );
  await screen.findByRole('dialog', { name: 'Delete list' });
  expect(
    screen.getByText(/Delete the list “To-Do” and its 2 tasks/),
  ).toBeInTheDocument();
});

test('deletes the active list after confirming in the dialog', async () => {
  const onDelete = vi.fn();
  render(<ListTabs {...defaultProps} onDelete={onDelete} />);
  await userEvent.click(screen.getByRole('button', { name: 'List options' }));
  await userEvent.click(
    await screen.findByRole('menuitem', { name: 'Delete list' }),
  );
  await screen.findByRole('dialog', { name: 'Delete list' });
  await userEvent.click(screen.getByRole('button', { name: 'Delete list' }));
  expect(onDelete).toHaveBeenCalledWith('l2');
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  );
});

test('cancelling the delete dialog does not delete the list', async () => {
  const onDelete = vi.fn();
  render(<ListTabs {...defaultProps} onDelete={onDelete} />);
  await userEvent.click(screen.getByRole('button', { name: 'List options' }));
  await userEvent.click(
    await screen.findByRole('menuitem', { name: 'Delete list' }),
  );
  await screen.findByRole('dialog', { name: 'Delete list' });
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  );
  expect(onDelete).not.toHaveBeenCalled();
});

test('disables "Delete list" while only one list remains', async () => {
  render(
    <ListTabs
      lists={[{ id: 'l1', name: 'To-Do', tasks: [] }]}
      activeListId="l1"
      onSelect={vi.fn()}
      onAdd={vi.fn()}
      onRename={vi.fn()}
      onDelete={vi.fn()}
    />,
  );
  await userEvent.click(screen.getByRole('button', { name: 'List options' }));
  const deleteItem = await screen.findByRole('menuitem', {
    name: 'Delete list',
  });
  // MUI marks the disabled menu item with the Mui-disabled class and it
  // is removed from the tab order…
  expect(deleteItem).toHaveClass('Mui-disabled');
  expect(deleteItem).toHaveAttribute('tabindex', '-1');
  // …while "Rename list" stays available.
  expect(screen.getByRole('menuitem', { name: 'Rename list' })).toBeEnabled();
});
