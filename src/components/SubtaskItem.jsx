import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

/**
 * Renders a single subtask with a checkbox, optional description and an inline edit form.
 * Props:
 *   sub - the subtask object {id, title, description, done}
 *   onToggle - callback invoked when the checkbox is toggled
 *   onDelete - callback invoked when the delete button is clicked
 *   onEdit - callback invoked when the edit form is saved (receives {title, description})
 */
export default function SubtaskItem({ sub, onToggle, onDelete, onEdit }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');

  const subTitleId = `sub-title-${sub.id}`;
  const subDescId = `sub-desc-${sub.id}`;
  const subCheckboxId = `sub-done-${sub.id}`;

  const startEdit = () => {
    setDraftTitle(sub.title);
    setDraftDescription(sub.description || '');
    setIsEditing(true);
  };

  const cancelEdit = () => setIsEditing(false);

  const saveEdit = (e) => {
    e.preventDefault();
    if (!draftTitle.trim()) return;
    onEdit({ title: draftTitle, description: draftDescription });
    setIsEditing(false);
  };

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
        <Button type="button" size="small" onClick={startEdit}>
          Edit Subtask
        </Button>
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
      {isEditing && (
        <Box component="form" onSubmit={saveEdit} sx={{ ml: 4, mt: 1 }}>
          <TextField
            id={`edit-subtitle-${sub.id}`}
            label="Edit Subtask Title"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            required
            fullWidth
            margin="normal"
          />
          <TextField
            id={`edit-subdesc-${sub.id}`}
            label="Edit Subtask Description (optional)"
            value={draftDescription}
            onChange={(e) => setDraftDescription(e.target.value)}
            fullWidth
            margin="normal"
          />
          <Button type="submit" size="small" variant="contained" sx={{ mt: 1 }}>
            Save Subtask
          </Button>
          <Button type="button" size="small" onClick={cancelEdit} sx={{ mt: 1 }}>
            Cancel Subtask
          </Button>
        </Box>
      )}
    </Box>
  );
}
