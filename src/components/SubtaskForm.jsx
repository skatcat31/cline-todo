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
 *   idPrefix - prefix used for the field ids (e.g. the parent task's id).
 *              Multiple forms can be open at once, so ids must not be
 *              global constants.
 *   onSubmit - called with {title, description} when a valid form is submitted
 *   onCancel - closes the form without saving
 */
export default function SubtaskForm({ idPrefix = '', onSubmit, onCancel }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), description: description.trim() });
  };

  const fieldId = (suffix) => (idPrefix ? `${idPrefix}-${suffix}` : suffix);

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, pl: 5 }}>
      <TextField
        id={fieldId('subtask-title')}
        label="Subtask Title"
        placeholder="Subtask title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        fullWidth
        margin="normal"
      />
      <TextField
        id={fieldId('subtask-desc')}
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
