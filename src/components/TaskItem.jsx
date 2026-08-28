import { useState } from 'react';
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
import SubtaskForm from './SubtaskForm.jsx';

/**
 * Renders a single task, its description, its subtasks and the UI for adding
 * a subtask. The subtask form state is owned by this component (via
 * `SubtaskForm`), so no form state is hoisted to the app level.
 * Props:
 *   task - the task object {id, title, description, done, subtasks}
 *   onToggleDone - toggles the task's done state (receives the task id)
 *   onDelete - deletes the task (receives the task id)
 *   onEdit - updates the task (receives id and {title, description})
 *   onAddSubtask - adds a subtask (receives the parent id and
 *                  {title, description}); returns the created subtask's id
 *   onToggleSubtask - toggles a subtask's done state (receives parent and subtask ids)
 *   onDeleteSubtask - deletes a subtask (receives parent and subtask ids)
 *   onEditSubtask - updates a subtask (receives parent, subtask id and {title, description})
 */
export default function TaskItem({
  task,
  onToggleDone,
  onDelete,
  onEdit,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onEditSubtask,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  // Whether the inline "add subtask" form is open for this task.
  const [subtaskFormOpen, setSubtaskFormOpen] = useState(false);
  // Id of the subtask that should receive focus after it has been added.
  const [focusSubId, setFocusSubId] = useState(null);

  const startEdit = () => {
    setDraftTitle(task.title);
    setDraftDescription(task.description || '');
    setIsEditing(true);
  };

  const cancelEdit = () => setIsEditing(false);

  const saveEdit = (e) => {
    e.preventDefault();
    if (!draftTitle.trim()) return;
    onEdit(task.id, { title: draftTitle, description: draftDescription });
    setIsEditing(false);
  };

  const handleAddSubtask = ({ title, description }) => {
    const subId = onAddSubtask(task.id, { title, description });
    // Once the new subtask has rendered, move focus to its checkbox.
    setFocusSubId(subId);
    setSubtaskFormOpen(false);
  };

  return (
    <Box
      component="li"
      aria-labelledby={`task-title-${task.id}`}
      sx={{ px: 2, py: 2 }}
    >
      {/* Row: checkbox + primary/secondary text (Material list item pattern) */}
      <Box display="flex" alignItems="flex-start" gap={1}>
        <Checkbox
          id={`done-${task.id}`}
          checked={task.done}
          onChange={() => onToggleDone(task.id)}
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
      <Box display="flex" alignItems="center" gap={0.5} sx={{ pl: 5, mt: 0.5 }}>
        <IconButton
          size="small"
          aria-label="Add subtask"
          onClick={() => setSubtaskFormOpen(true)}
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
          onClick={() => onDelete(task.id)}
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
              autoFocus={focusSubId === sub.id}
              onToggle={() => onToggleSubtask(task.id, sub.id)}
              onDelete={() => onDeleteSubtask(task.id, sub.id)}
              onEdit={({ title, description }) =>
                onEditSubtask(task.id, sub.id, { title, description })
              }
            />
          ))}
        </List>
      )}
      {/* Subtask entry form (shown only while open for this task) */}
      {subtaskFormOpen && (
        <SubtaskForm
          idPrefix={task.id}
          onSubmit={handleAddSubtask}
          onCancel={() => setSubtaskFormOpen(false)}
        />
      )}
      {/* Material list divider between tasks (negative margin to bleed
          to the card edges) */}
      <Divider sx={{ mx: -2 }} />
    </Box>
  );
}
