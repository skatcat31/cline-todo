import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import '@testing-library/jest-dom/vitest';
import { expect, test, vi } from 'vitest';
import SearchBar from './SearchBar.jsx';

// Unit tests for the extracted SearchBar: it only reports the query – the
// parent owns the search state (and the filtering).

// The search field is a controlled component; this wrapper gives it real
// state (mirroring how App.jsx uses it) so multi‑keystroke input accumulates
// like in the app.
function renderSearchBar(onSearchChange = vi.fn()) {
  const Wrapper = () => {
    const [value, setValue] = useState('');
    return (
      <SearchBar
        value={value}
        onSearchChange={(v) => {
          setValue(v);
          onSearchChange(v);
        }}
      />
    );
  };
  return render(<Wrapper />);
}

test('renders an accessible, initially empty search field', () => {
  renderSearchBar();
  const field = screen.getByRole('textbox', { name: 'Search tasks' });
  expect(field).toBeInTheDocument();
  expect(field).toHaveValue('');
});

test('shows the current query', () => {
  render(<SearchBar value="milk" onSearchChange={vi.fn()} />);
  expect(screen.getByRole('textbox', { name: 'Search tasks' })).toHaveValue(
    'milk',
  );
});

test('reports every change to the query', async () => {
  const onSearchChange = vi.fn();
  renderSearchBar(onSearchChange);
  await userEvent.type(
    screen.getByRole('textbox', { name: 'Search tasks' }),
    'abc',
  );
  expect(onSearchChange).toHaveBeenNthCalledWith(1, 'a');
  expect(onSearchChange).toHaveBeenNthCalledWith(2, 'ab');
  expect(onSearchChange).toHaveBeenNthCalledWith(3, 'abc');
});

test('reports clearing the query', async () => {
  const onSearchChange = vi.fn();
  render(<SearchBar value="abc" onSearchChange={onSearchChange} />);
  await userEvent.clear(screen.getByRole('textbox', { name: 'Search tasks' }));
  expect(onSearchChange).toHaveBeenCalledWith('');
});
