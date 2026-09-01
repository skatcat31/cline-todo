// Due‑date reminders in the app: the app‑bar button (permission state,
// on/off toggle) and the reminder announcement for tasks due today.
import App from './App';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// Compatibility layer for jest-dom with Vitest
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { todayISO } from './utils/dates.js';

// A stand‑in for the Notification API (permission granted).
class MockNotification {
  static permission = 'granted';
  static instances = [];
  static requestPermission = vi.fn(() => Promise.resolve('granted'));
  constructor(title, options) {
    MockNotification.instances.push({ title, ...options });
  }
}

beforeEach(() => {
  MockNotification.instances = [];
  vi.stubGlobal('Notification', MockNotification);
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

test('announces a task due today and offers to turn the reminders off', () => {
  localStorage.setItem(
    'tasks',
    JSON.stringify([
      { id: 'r1', title: 'Reminder task', due: todayISO(), done: false },
    ]),
  );
  render(<App />);
  // Granted + enabled (the default) → the "turn off" state is shown…
  expect(
    screen.getByRole('button', { name: 'Turn off due‑date reminders' }),
  ).toBeInTheDocument();
  // …and the task due today was announced.
  expect(MockNotification.instances).toHaveLength(1);
  expect(MockNotification.instances[0]).toEqual({
    title: 'Task due today',
    body: 'Reminder task',
  });
});

test('toggles the reminders off and remembers the choice', async () => {
  render(<App />);
  await userEvent.click(
    screen.getByRole('button', { name: 'Turn off due‑date reminders' }),
  );
  expect(
    screen.getByRole('button', { name: 'Turn on due‑date reminders' }),
  ).toBeInTheDocument();
  expect(localStorage.getItem('todo-reminders')).toBe('off');

  // …and switching back on works again.
  await userEvent.click(
    screen.getByRole('button', { name: 'Turn on due‑date reminders' }),
  );
  expect(
    screen.getByRole('button', { name: 'Turn off due‑date reminders' }),
  ).toBeInTheDocument();
  expect(localStorage.getItem('todo-reminders')).toBe('on');
});
