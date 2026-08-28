import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

// The app provides its own ThemeProvider/CssBaseline (so the color-scheme
// toggle can rebuild the theme), so the entry point only mounts the App
// behind the error boundary.

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Last-resort safety net: a rendering crash shows a friendly message
        with a reload button instead of a blank page. */}
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
