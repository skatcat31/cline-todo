import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { expect, test, vi } from 'vitest';
import ErrorBoundary from './ErrorBoundary.jsx';

// A child that always throws, used to force the boundary into its error state.
function Boom() {
  throw new Error('boom');
}

test('renders children while no error has occurred', () => {
  render(
    <ErrorBoundary>
      <p>all good</p>
    </ErrorBoundary>,
  );
  expect(screen.getByText('all good')).toBeInTheDocument();
});

test('shows the fallback UI when a child throws', () => {
  render(
    <ErrorBoundary>
      <Boom />
    </ErrorBoundary>,
  );
  expect(screen.getByRole('alert')).toBeInTheDocument();
  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
});

test('the fallback offers a reload button that reloads the page', async () => {
  // jsdom's location.reload cannot be spied on directly, so swap in a fake
  // location for the duration of the test.
  const originalLocation = window.location;
  const reload = vi.fn();
  Object.defineProperty(window, 'location', {
    value: { ...originalLocation, reload },
    writable: true,
    configurable: true,
  });
  try {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    await userEvent.click(screen.getByRole('button', { name: /reload page/i }));
    expect(reload).toHaveBeenCalledTimes(1);
  } finally {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  }
});
