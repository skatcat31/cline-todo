import React from 'react';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import Typography from '@mui/material/Typography';

/**
 * Renders a single subtask with a checkbox and optional description.
 * Props:
 *   sub - the subtask object {title, description, done}
 *   parentIdx - index of the parent task (used for generating stable ids)
 *   subIdx - index of this subtask within its parent
 *   onToggle - callback invoked when the checkbox is toggled
 */
export default function SubtaskItem({ sub, parentIdx, subIdx, onToggle }) {
  const subTitleId = `sub-title-${parentIdx}-${subIdx}`;
  const subDescId = `sub-desc-${parentIdx}-${subIdx}`;
  const subCheckboxId = `sub-done-${parentIdx}-${subIdx}`;

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
          inputProps={{ 'aria-label': 'subtask done' }}
        />
        <Typography
          id={subTitleId}
          component="span"
          variant="body1"
          sx={{ textDecoration: sub.done ? 'line-through' : 'none' }}
        >
          {sub.title}
        </Typography>
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
