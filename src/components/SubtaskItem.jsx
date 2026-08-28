import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutline';

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
      {/* Row: checkbox + primary/secondary text (Material list item pattern) */}
      <Box display="flex" alignItems="flex-start" gap={1}>
        <Checkbox
          id={subCheckboxId}
          checked={sub.done}
          onChange={onToggle}
          inputProps={{ 'aria-labelledby': subTitleId }}
          sx={{ mt: -0.5 }}
        />
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography
            id={subTitleId}
            component="span"
            variant="body1"
            sx={{ textDecoration: sub.done ? 'line-through' : 'none' }}
          >
            {sub.title}
          </Typography>
          {sub.description && (
            <Typography
              id={subDescId}
              variant="body2"
              color="text.secondary"
              sx={{ textDecoration: sub.done ? 'line-through' : 'none' }}
            >
              {sub.description}
            </Typography>
          )}
        </Box>
      </Box>
      {/* Action buttons: Material icon buttons, aligned with the subtask's details */}
      <Box display="flex" alignItems="center" gap={0.5} sx={{ pl: 5, mt: 0.5 }}>
        <IconButton size="small" aria-label="Edit subtask" onClick={startEdit}>
          <EditOutlined fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          aria-label="Delete subtask"
          color="error"
          onClick={onDelete}
        >
          <DeleteOutline fontSize="small" />
        </IconButton>
      </Box>
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
            Cancel Edit
          </Button>
        </Box>
      )}
    </Box>
  );
}
