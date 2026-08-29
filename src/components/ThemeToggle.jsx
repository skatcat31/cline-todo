import IconButton from '@mui/material/IconButton';
import DarkMode from '@mui/icons-material/DarkMode';
import LightMode from '@mui/icons-material/LightMode';

/**
 * Light/dark color‑scheme toggle for the app bar (the choice itself is
 * persisted by the app).
 * Props:
 *   mode - the active scheme ("light" | "dark")
 *   onToggle - switch to the other scheme
 */
export default function ThemeToggle({ mode, onToggle }) {
  return (
    <IconButton
      color="inherit"
      aria-label={
        mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'
      }
      onClick={onToggle}
    >
      {mode === 'light' ? (
        <DarkMode fontSize="small" />
      ) : (
        <LightMode fontSize="small" />
      )}
    </IconButton>
  );
}
