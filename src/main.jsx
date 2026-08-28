import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import theme from './theme.js';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Last-resort safety net: a rendering crash shows a friendly message
        with a reload button instead of a blank page. */}
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        {/* CssBaseline resets browser styles and applies the theme's
            typography, color scheme and background – the standard
            Material Design document baseline. */}
        <CssBaseline />
        <App />
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
