import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

/**
 * Inline form for adding a subtask to a parent task.
 *
 * The form owns its draft state, so every task can open its own form
 * independently instead of hoisting the state up to the app level.
 * Props:
 *   onSubmit - called with {title, description} when a valid form is submitted
 *   onCancel - closes the form without saving
 */
export default function SubtaskForm({ onSubmit, onCancel }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), description: description.trim() });
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, pl: 5 }}>
      <TextField
        id="subtask-title"
        label="Subtask Title"
        placeholder="Subtask title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        fullWidth
        margin="normal"
      />
      <TextField
        id="subtask-desc"
        label="Subtask Description (optional)"
        placeholder="Subtask description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        multiline
        rows={2}
        fullWidth
        margin="normal"
      />
      <Button type="submit" variant="contained" size="small" sx={{ mt: 1 }}>
        Add Subtask
      </Button>
      <Button type="button" onClick={onCancel} sx={{ mt: 1 }}>
        Cancel
      </Button>
    </Box>
  );
}
