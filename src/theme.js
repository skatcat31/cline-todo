import { createTheme } from '@mui/material/styles';

/**
 * Material Design themes for the To‑Do application, in light and dark
 * variants.
 *
 * The palette follows the Material color system (a "primary" brand color
 * applied to buttons, checkboxes and links, plus neutral "background"
 * surface colors), the typography scale is the standard Material Roboto
 * stack, and button labels keep sentence case as recommended by the
 * Material 3 text‑style guidance.
 *
 * `createAppTheme(mode)` builds the theme for the given color scheme; the
 * app calls it whenever the user toggles the mode.
 */
const palettes = {
  light: {
    mode: 'light',
    // Blue 800 – the classic Material primary.
    primary: { main: '#1565c0' },
    // Teal 700 – secondary accent for selected states.
    secondary: { main: '#00796b' },
    // Neutral surface colors for the window background and paper surfaces.
    background: { default: '#fafafa', paper: '#ffffff' },
  },
  dark: {
    mode: 'dark',
    // Lighter variants of the brand colors keep good contrast on dark
    // surfaces (Blue 200 / Teal 300).
    primary: { main: '#90caf9' },
    secondary: { main: '#4db6ac' },
    background: { default: '#121212', paper: '#1e1e1e' },
  },
};

export function createAppTheme(mode = 'light') {
  const palette = palettes[mode] ?? palettes.light;
  return createTheme({
    palette,
    typography: {
      // Roboto is the Material Design typeface.
      fontFamily: ['"Roboto"', '"Helvetica"', '"Arial"', 'sans-serif'].join(
        ',',
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
}
