import BrightnessAuto from '@mui/icons-material/BrightnessAuto';
import DarkMode from '@mui/icons-material/DarkMode';
import LightMode from '@mui/icons-material/LightMode';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

// The color‑scheme choices offered in the app bar, in display order.
const MODES = [
  { value: 'light', label: 'Light theme', Icon: LightMode },
  { value: 'system', label: 'System theme', Icon: BrightnessAuto },
  { value: 'dark', label: 'Dark theme', Icon: DarkMode },
];

/**
 * Light / system / dark color‑scheme selector for the app bar. The choice
 * itself (and its persistence) is owned by the parent; this component only
 * reports the selection.
 * Props:
 *   mode - the active scheme ("light" | "system" | "dark")
 *   onModeChange - called with the chosen scheme
 */
export default function ThemeToggle({ mode, onModeChange }) {
  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={mode}
      // With an exclusive group, re‑selecting the active button passes
      // `null`; ignore that – a mode cannot be "deselected".
      onChange={(_, value) => {
        if (value) onModeChange(value);
      }}
      aria-label="Color scheme"
      sx={{
        // Sit on the colored app bar like the old toggle button did: the
        // buttons stay transparent and inherit its text color; the active
        // scheme is indicated by an underline in the same color.
        '& .MuiToggleButton-root': {
          color: 'inherit',
          border: 'none',
          '&.Mui-selected': {
            boxShadow: 'inset 0 -2px 0 0 currentColor',
            '&:hover': { boxShadow: 'inset 0 -2px 0 0 currentColor' },
          },
        },
      }}
    >
      {MODES.map(({ value, label, Icon }) => (
        <ToggleButton key={value} value={value} aria-label={label}>
          <Icon fontSize="small" />
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
