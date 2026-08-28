import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App.jsx';
import theme from './theme.js';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      {/* CssBaseline resets browser styles and applies the theme's
          typography, color scheme and background – the standard
          Material Design document baseline. */}
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
