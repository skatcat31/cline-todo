import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddCircleOutlined from '@mui/icons-material/AddCircleOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import ArrowUpward from '@mui/icons-material/ArrowUpward';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
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
 *   onMoveUp - move this task one row up in the visible list
 *   onMoveDown - move this task one row down in the visible list
 *   canMoveUp - whether a row exists above this one (disables the up button)
 *   canMoveDown - whether a row exists below this one (disables the down button)
 *   focusToken - a changing, non-null token that moves focus to this
 *                task's checkbox (the parent sets it for the task that
 *                now occupies a just-deleted task's position; a token
 *                rather than a boolean so repeat deletes re-trigger it)
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
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
  focusToken = null,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  // Whether the inline "add subtask" form is open for this task.
  const [subtaskFormOpen, setSubtaskFormOpen] = useState(false);
  // Id of the subtask that should receive focus after it has been added.
  const [focusSubId, setFocusSubId] = useState(null);
  // Checkbox ref: used to move focus to this task when the parent sets
  // focusToken (after a neighbouring task was deleted).
  const checkboxRef = useRef(null);
  useEffect(() => {
    if (focusToken) {
      checkboxRef.current?.focus();
    }
  }, [focusToken]);

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
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <Checkbox
          id={`done-${task.id}`}
          checked={task.done}
          onChange={() => onToggleDone(task.id)}
          slotProps={{
            input: {
              'aria-labelledby': `task-title-${task.id}`,
              ref: checkboxRef,
            },
          }}
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

      {/* Subtask progress: "2 of 5 subtasks done" below the task text */}
      {task.subtasks && task.subtasks.length > 0 && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', pl: 5, mt: 0.5 }}
          aria-live="polite"
        >
          {`${task.subtasks.filter((s) => s.done).length} of ${
            task.subtasks.length
          } ${task.subtasks.length === 1 ? 'subtask' : 'subtasks'} done`}
        </Typography>
      )}

      {/* Action row: Material icon buttons for adding a subtask, editing,
          deleting and reordering */}
      <Box
        sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: 5, mt: 0.5 }}
      >
        <IconButton
          size="small"
          aria-label="Add subtask"
          onClick={() => setSubtaskFormOpen(true)}
        >
          <AddCircleOutlined fontSize="small" />
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
          <DeleteOutlined fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          aria-label="Move task up"
          disabled={!canMoveUp}
          onClick={onMoveUp}
        >
          <ArrowUpward fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          aria-label="Move task down"
          disabled={!canMoveDown}
          onClick={onMoveDown}
        >
          <ArrowDownward fontSize="small" />
        </IconButton>
      </Box>

      {/* Edit form (shown only while editing this task). Escape cancels the
          edit; the title field receives focus when the form opens. */}
      {isEditing && (
        <Box
          component="form"
          onSubmit={saveEdit}
          onKeyDown={(e) => {
            if (e.key === 'Escape') cancelEdit();
          }}
          sx={{ mt: 1, pl: 5 }}
        >
          <TextField
            id={`edit-title-${task.id}`}
            label="Edit Title"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            required
            fullWidth
            margin="normal"
            autoFocus
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
