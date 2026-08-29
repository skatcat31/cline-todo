import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Typography from '@mui/material/Typography';
import { FILTERS } from '../utils/filters.js';

/**
 * Filter bar: All / Active / Completed buttons, the "N of M tasks active"
 * counter and the "Clear completed" action (only shown while completed
 * tasks exist).
 * Props:
 *   filter - the active filter value ("all" | "active" | "completed")
 *   onFilterChange - receives the newly selected filter value
 *   activeCount - number of not‑yet‑done tasks
 *   totalCount - number of all tasks
 *   completedCount - number of done tasks
 *   onClearCompleted - removes all completed tasks
 */
export default function FilterBar({
  filter,
  onFilterChange,
  activeCount,
  totalCount,
  completedCount,
  onClearCompleted,
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
      <ButtonGroup size="small" aria-label="Filter tasks">
        {FILTERS.map(({ value, label }) => (
          <Button
            key={value}
            variant={filter === value ? 'contained' : 'text'}
            aria-pressed={filter === value}
            onClick={() => onFilterChange(value)}
          >
            {label}
          </Button>
        ))}
      </ButtonGroup>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ flexGrow: 1, textAlign: 'center' }}
        aria-live="polite"
      >
        {`${activeCount} of ${totalCount} ${
          totalCount === 1 ? 'task' : 'tasks'
        } active`}
      </Typography>
      {completedCount > 0 && (
        <Button size="small" color="error" onClick={onClearCompleted}>
          Clear completed
        </Button>
      )}
    </Box>
  );
}
