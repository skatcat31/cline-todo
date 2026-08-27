import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import SubtaskItem from './SubtaskItem.jsx';

/**
 * Renders a single task, its description, its subtasks and the UI for adding a subtask.
 * Props:
 *   task - the task object {title, description, done, subtasks}
 *   idx - index of the task in the tasks array
 *   toggleDone - handler to toggle task done state
 *   toggleSubtaskDone - handler to toggle a subtask done state
 *   subtaskParentIdx - currently selected parent index for adding a subtask
 *   setSubtaskParentIdx - setter to open the subtask form for a specific task
 *   subtaskTitle, setSubtaskTitle, subtaskDescription, setSubtaskDescription
 *   handleAddSubtask - submit handler for the subtask form
 */
export default function TaskItem({
  task,
  idx,
  toggleDone,
  toggleSubtaskDone,
  subtaskParentIdx,
  setSubtaskParentIdx,
  subtaskTitle,
  setSubtaskTitle,
  subtaskDescription,
  setSubtaskDescription,
  handleAddSubtask,
}) {
  return (
    <Box key={idx} component="li" aria-labelledby={`task-title-${idx}`} sx={{ mb: 2 }}>
      <Box display="flex" alignItems="center">
        <Checkbox
          id={`done-${idx}`}
          checked={task.done}
          onChange={() => toggleDone(idx)}
          inputProps={{ 'aria-label': 'task done' }}
        />
        <Typography
          id={`task-title-${idx}`}
          component="span"
          variant="h6"
          sx={{ textDecoration: task.done ? 'line-through' : 'none' }}
        >
          {task.title}
        </Typography>
      </Box>
      {task.description && (
        <Typography
          id={`task-desc-${idx}`}
          variant="body2"
          sx={{ ml: 4, textDecoration: task.done ? 'line-through' : 'none' }}
        >
          {task.description}
        </Typography>
      )}
      {/* Subtasks */}
      {task.subtasks && task.subtasks.length > 0 && (
        <List component="ul" disablePadding sx={{ pl: 2, mt: 1 }}>
          {task.subtasks.map((sub, sIdx) => (
            <SubtaskItem
              key={sIdx}
              sub={sub}
              parentIdx={idx}
              subIdx={sIdx}
              onToggle={() => toggleSubtaskDone(idx, sIdx)}
            />
          ))}
        </List>
      )}
      {/* Button to add a subtask */}
      <Button type="button" onClick={() => setSubtaskParentIdx(idx)} sx={{ mt: 1 }}>
        Add Subtask
      </Button>
      {/* Subtask entry form (shown only for the selected parent) */}
      {subtaskParentIdx === idx && (
        <Box component="form" onSubmit={handleAddSubtask} sx={{ mt: 1 }}>
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
          <Button type="submit" variant="contained" sx={{ mt: 1 }}>
            Add Subtask
          </Button>
        </Box>
      )}
      <Divider sx={{ my: 2 }} />
    </Box>
  );
}
