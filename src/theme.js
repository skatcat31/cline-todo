import { createTheme } from '@mui/material/styles';

/**
 * Material Design theme for the To‑Do application.
 *
 * The palette follows the Material color system (a "primary" brand color
 * applied to buttons, checkboxes and links, plus a neutral "background"
 * surface color), the typography scale is the standard Material Roboto
 * stack, and button labels keep sentence case as recommended by the
 * Material 3 text‑style guidance.
 */
const theme = createTheme({
  palette: {
    mode: 'light',
    // Blue 800 – the classic Material primary.
    primary: { main: '#1565c0' },
    // Teal 700 – secondary accent for selected states.
    secondary: { main: '#00796b' },
    // Neutral surface colors for the window background and paper surfaces.
    background: { default: '#fafafa', paper: '#ffffff' },
  },
  typography: {
    // Roboto is the Material Design typeface.
    fontFamily: ['"Roboto"', '"Helvetica"', '"Arial"', 'sans-serif'].join(
      ','
    ),
  },
  shape: {
    // 10px corner radius for cards, buttons and text fields.
    borderRadius: 10,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          // Material buttons use sentence case, not ALL CAPS.
          textTransform: 'none',
        },
      },
    },
  },
});

export default theme;
