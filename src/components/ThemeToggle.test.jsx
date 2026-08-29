import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { expect, test, vi } from 'vitest';
import ThemeToggle from './ThemeToggle.jsx';

// Unit tests for the extracted ThemeToggle component: it only reports the
// click - the parent owns the mode state (and its persistence).

test('in light mode it offers to switch to dark mode', async () => {
  const onToggle = vi.fn();
  render(<ThemeToggle mode="light" onToggle={onToggle} />);
  const toggle = screen.getByRole('button', {
    name: 'Switch to dark mode',
  });
  await userEvent.click(toggle);
  expect(onToggle).toHaveBeenCalledTimes(1);
});

test('in dark mode it offers to switch to light mode', async () => {
  const onToggle = vi.fn();
  render(<ThemeToggle mode="dark" onToggle={onToggle} />);
  const toggle = screen.getByRole('button', {
    name: 'Switch to light mode',
  });
  await userEvent.click(toggle);
  expect(onToggle).toHaveBeenCalledTimes(1);
});
