// Self‑hosted Roboto (the Material Design typeface) – keeps the PWA's
// typography working offline and removes the third‑party CDN dependency.
// Only the *latin* subset is loaded: the UI is English‑only (the date
// formatting is even pinned to en‑US), while the bare 400/500/700 stylesheets
// pull in every Unicode subset (cyrillic, greek, vietnamese, math, …) that
// no user of this app ever renders.
import '@fontsource/roboto/latin-400.css';
import '@fontsource/roboto/latin-500.css';
import '@fontsource/roboto/latin-700.css';
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
