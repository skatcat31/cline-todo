import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ChecklistIcon from '@mui/icons-material/Checklist';

/**
 * Material Design empty state shown when there are no tasks:
 * a large secondary icon above a short caption.
 * It matches the UI that the tests assert on.
 */
export default function Placeholder() {
  return (
    <Box sx={{ my: 4, textAlign: 'center' }}>
      <ChecklistIcon
        aria-hidden="true"
        sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }}
      />
      <Typography variant="body1" component="p" sx={{ color: 'text.secondary' }}>
        No tasks yet. Add one above!
      </Typography>
    </Box>
  );
}
