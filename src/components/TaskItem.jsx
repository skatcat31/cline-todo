import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddCircleOutline from '@mui/icons-material/AddCircleOutline';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import SubtaskItem from './SubtaskItem.jsx';

/**
 * Renders a single task, its description, its subtasks and the UI for adding a subtask.
 * Props:
 *   task - the task object {id, title, description, done, subtasks}
 *   toggleDone - handler to toggle task done state (receives the task id)
 *   deleteTask - handler to delete the task (receives the task id)
 *   editTask - handler to update the task (receives id and {title, description})
 *   toggleSubtaskDone - handler to toggle a subtask done state (receives parent and subtask ids)
 *   deleteSubtask - handler to delete a subtask (receives parent and subtask ids)
 *   editSubtask - handler to update a subtask (receives parent, subtask id and {title, description})
 *   subtaskParentId - currently selected parent id for adding a subtask
 *   setSubtaskParentId - setter to open the subtask form for a specific task
 *   subtaskTitle, setSubtaskTitle, subtaskDescription, setSubtaskDescription
 *   handleAddSubtask - submit handler for the subtask form
 */
export default function TaskItem({
  task,
  toggleDone,
  deleteTask,
  editTask,
  toggleSubtaskDone,
  deleteSubtask,
  editSubtask,
  subtaskParentId,
  setSubtaskParentId,
  subtaskTitle,
  setSubtaskTitle,
  subtaskDescription,
  setSubtaskDescription,
  handleAddSubtask,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');

  const startEdit = () => {
    setDraftTitle(task.title);
    setDraftDescription(task.description || '');
    setIsEditing(true);
  };

  const cancelEdit = () => setIsEditing(false);

  const saveEdit = (e) => {
    e.preventDefault();
    if (!draftTitle.trim()) return;
    editTask(task.id, { title: draftTitle, description: draftDescription });
    setIsEditing(false);
  };

  return (
    <Box component="li" aria-labelledby={`task-title-${task.id}`} sx={{ px: 2, py: 2 }}>
      {/* Row: checkbox + primary/secondary text (Material list item pattern) */}
      <Box display="flex" alignItems="flex-start" gap={1}>
        <Checkbox
          id={`done-${task.id}`}
          checked={task.done}
          onChange={() => toggleDone(task.id)}
          inputProps={{ 'aria-labelledby': `task-title-${task.id}` }}
          sx={{ mt: -0.5 }}
        />
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography
            id={`task-title-${task.id}`}
            component="span"
            variant="subtitle1"
            sx={{ textDecoration: task.done ? 'line-through' : 'none' }}
          >
            {task.title}
          </Typography>
          {task.description && (
            <Typography
              id={`task-desc-${task.id}`}
              variant="body2"
              color="text.secondary"
              sx={{ textDecoration: task.done ? 'line-through' : 'none' }}
            >
              {task.description}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Action row: Material icon buttons for adding a subtask, editing and deleting */}
      <Box
        display="flex"
        alignItems="center"
        gap={0.5}
        sx={{ pl: 5, mt: 0.5 }}
      >
        <IconButton
          size="small"
          aria-label="Add subtask"
          onClick={() => setSubtaskParentId(task.id)}
        >
          <AddCircleOutline fontSize="small" />
        </IconButton>
        <IconButton size="small" aria-label="Edit task" onClick={startEdit}>
          <EditOutlined fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          aria-label="Delete task"
          color="error"
          onClick={() => deleteTask(task.id)}
        >
          <DeleteOutline fontSize="small" />
        </IconButton>
      </Box>

      {/* Edit form (shown only while editing this task) */}
      {isEditing && (
        <Box component="form" onSubmit={saveEdit} sx={{ mt: 1, pl: 5 }}>
          <TextField
            id={`edit-title-${task.id}`}
            label="Edit Title"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            required
            fullWidth
            margin="normal"
          />
          <TextField
            id={`edit-desc-${task.id}`}
            label="Edit Description (optional)"
            value={draftDescription}
            onChange={(e) => setDraftDescription(e.target.value)}
            fullWidth
            margin="normal"
          />
          <Button type="submit" variant="contained" size="small" sx={{ mt: 1 }}>
            Save Task
          </Button>
          <Button type="button" onClick={cancelEdit} sx={{ mt: 1 }}>
            Cancel Edit
          </Button>
        </Box>
      )}
      {/* Subtasks */}
      {task.subtasks && task.subtasks.length > 0 && (
        <List component="ul" disablePadding sx={{ pl: 5, mt: 1 }}>
          {task.subtasks.map((sub) => (
            <SubtaskItem
              key={sub.id}
              sub={sub}
              onToggle={() => toggleSubtaskDone(task.id, sub.id)}
              onDelete={() => deleteSubtask(task.id, sub.id)}
              onEdit={({ title, description }) =>
                editSubtask(task.id, sub.id, { title, description })
              }
            />
          ))}
        </List>
      )}
      {/* Subtask entry form (shown only for the selected parent) */}
      {subtaskParentId === task.id && (
        <Box component="form" onSubmit={handleAddSubtask} sx={{ mt: 1, pl: 5 }}>
          <TextField
            id="subtask-title"
            label="Subtask Title"
            placeholder="Subtask title"
            value={subtaskTitle}
            onChange={(e) => setSubtaskTitle(e.target.value)}
            required
            fullWidth
            margin="normal"
          />
          <TextField
            id="subtask-desc"
            label="Subtask Description (optional)"
            placeholder="Subtask description"
            value={subtaskDescription}
            onChange={(e) => setSubtaskDescription(e.target.value)}
            multiline
            rows={2}
            fullWidth
            margin="normal"
          />
          <Button type="submit" variant="contained" size="small" sx={{ mt: 1 }}>
            Add Subtask
          </Button>
        </Box>
      )}
      {/* Material list divider between tasks (negative margin to bleed
          to the card edges) */}
      <Divider sx={{ mx: -2 }} />
    </Box>
  );
}

