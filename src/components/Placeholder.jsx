import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

/**
 * Placeholder component shown when there are no tasks.
 * It matches the UI that the tests assert on.
 */
export default function Placeholder() {
  return (
    <Box sx={{ mt: 2, textAlign: 'center' }}>
      <Typography component="p" sx={{ color: 'text.secondary' }}>
        No tasks yet. Add one above!
      </Typography>
    </Box>
  );
}
