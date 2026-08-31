import Box from '@mui/material/Box';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Search from '@mui/icons-material/Search';

/**
 * Compact search box that filters the task list by title, description or
 * subtask title. The parent owns the query state (searching is a transient
 * view filter, so the query is not persisted).
 * Props:
 *   value - the current query
 *   onSearchChange - called with the new query on every change
 */
export default function SearchBar({ value, onSearchChange }) {
  return (
    <Box sx={{ mb: 2 }}>
      <TextField
        size="small"
        fullWidth
        placeholder="Search tasks"
        value={value}
        onChange={(e) => onSearchChange(e.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          },
          htmlInput: { 'aria-label': 'Search tasks' },
        }}
      />
    </Box>
  );
}
