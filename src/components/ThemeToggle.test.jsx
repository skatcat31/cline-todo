import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { expect, test, vi } from 'vitest';
import ThemeToggle from './ThemeToggle.jsx';

// Unit tests for the extracted ThemeToggle component: it only reports the
// selection - the parent owns the mode state (and its persistence).

test('offers all three color schemes', () => {
  render(<ThemeToggle mode="light" onModeChange={vi.fn()} />);
  for (const label of ['Light theme', 'System theme', 'Dark theme']) {
    expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
  }
});

test('reports the chosen scheme', async () => {
  const onModeChange = vi.fn();
  render(<ThemeToggle mode="light" onModeChange={onModeChange} />);
  await userEvent.click(screen.getByRole('button', { name: 'System theme' }));
  expect(onModeChange).toHaveBeenCalledTimes(1);
  expect(onModeChange).toHaveBeenCalledWith('system');
});

test('marks the active scheme with aria-pressed', () => {
  render(<ThemeToggle mode="dark" onModeChange={vi.fn()} />);
  expect(screen.getByRole('button', { name: 'Dark theme' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(screen.getByRole('button', { name: 'Light theme' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  expect(screen.getByRole('button', { name: 'System theme' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
});

test('does not report a mode when the active button is clicked again', async () => {
  const onModeChange = vi.fn();
  render(<ThemeToggle mode="dark" onModeChange={onModeChange} />);
  await userEvent.click(screen.getByRole('button', { name: 'Dark theme' }));
  expect(onModeChange).not.toHaveBeenCalled();
});
