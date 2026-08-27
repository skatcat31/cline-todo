/**
 * Test entry point defined in `src/main.jsx`.
 * The file does not export a component – it mounts the <App /> directly
 * into a DOM element with id "root". Importing the module therefore has the
 * side‑effect of rendering the application.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
// Compatibility layer for jest-dom matchers with Vitest
import '@testing-library/jest-dom/vitest';

// Ensure a root element exists before importing the module which performs the
// ReactDOM.createRoot(...).render() call.
beforeAll(() => {
  const root = document.createElement('div');
  root.setAttribute('id', 'root');
  document.body.appendChild(root);
});

test('main renders App and shows placeholder when no tasks exist', async () => {
  // Import the side‑effectful module. This will mount <App /> into the root.
  // The import must be inside the test to ensure the DOM is prepared.
  await import('./main.jsx');

  // The initial render of App shows the placeholder text when the task list
  // is empty. Verify that the placeholder appears, confirming that the render
  // path in main.jsx (lines 5‑9) was executed.
  // The placeholder text when there are no tasks is rendered by App.
  // Use async query to wait for the component to render.
  const placeholder = await screen.findByText('No tasks yet. Add one above!');
  expect(placeholder).toBeInTheDocument();
});
