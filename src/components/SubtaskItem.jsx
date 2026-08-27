import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Typography from '@mui/material/Typography';

/**
 * Renders a single subtask with a checkbox and optional description.
 * Props:
 *   sub - the subtask object {id, title, description, done}
 *   onToggle - callback invoked when the checkbox is toggled
 *   onDelete - callback invoked when the delete button is clicked
 */
export default function SubtaskItem({ sub, onToggle, onDelete }) {
  const subTitleId = `sub-title-${sub.id}`;
  const subDescId = `sub-desc-${sub.id}`;
  const subCheckboxId = `sub-done-${sub.id}`;

  return (
    <Box
      component="li"
      aria-labelledby={subTitleId}
      aria-describedby={sub.description ? subDescId : undefined}
      sx={{ mb: 1 }}
    >
      <Box display="flex" alignItems="center">
        <Checkbox
          id={subCheckboxId}
          checked={sub.done}
          onChange={onToggle}
          inputProps={{ 'aria-labelledby': subTitleId }}
        />
        <Typography
          id={subTitleId}
          component="span"
          variant="body1"
          sx={{ textDecoration: sub.done ? 'line-through' : 'none' }}
        >
          {sub.title}
        </Typography>
        <Button type="button" size="small" color="error" onClick={onDelete}>
          Delete Subtask
        </Button>
      </Box>
      {sub.description && (
        <Typography
          id={subDescId}
          variant="body2"
          sx={{ ml: 4, textDecoration: sub.done ? 'line-through' : 'none' }}
        >
          {sub.description}
        </Typography>
      )}
    </Box>
  );
}
