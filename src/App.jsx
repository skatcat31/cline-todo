import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import List from '@mui/material/List';
import Divider from '@mui/material/Divider';

// A simple To Do application allowing users to add tasks with a title and description.
function App() {
  // State for the list of tasks
  const [tasks, setTasks] = useState([]);
  // State for adding a subtask to a specific parent task
  const [subtaskParentIdx, setSubtaskParentIdx] = useState(null);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [subtaskDescription, setSubtaskDescription] = useState('');
  // Controlled input state for new task
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Handle adding a new top‑level task
  const handleAddTask = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const newTask = {
      title: title.trim(),
      description: description.trim(),
      done: false,
      subtasks: [],
    };
    setTasks((prev) => [...prev, newTask]);
    setTitle('');
    setDescription('');
  };

  // Toggle the "done" state of a task
  const toggleDone = (index) => {
    setTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, done: !t.done } : t))
    );
  };

  // Toggle done for a subtask given parent and subtask indexes
  const toggleSubtaskDone = (parentIdx, subIdx) => {
    setTasks((prev) =>
      prev.map((t, i) => {
        if (i !== parentIdx) return t;
        const newSubs = t.subtasks.map((s, si) =>
          si === subIdx ? { ...s, done: !s.done } : s
        );
        return { ...t, subtasks: newSubs };
      })
    );
  };

  // Handle adding a subtask to the currently selected parent
  const handleAddSubtask = (e) => {
    e.preventDefault();
    if (subtaskParentIdx === null) return;
    if (!subtaskTitle.trim()) return;
    const newSub = {
      title: subtaskTitle.trim(),
      description: subtaskDescription.trim(),
      done: false,
    };
    const newIdx = tasks[subtaskParentIdx]?.subtasks?.length ?? 0;
    setTasks((prev) =>
      prev.map((t, i) => {
        if (i !== subtaskParentIdx) return t;
        return { ...t, subtasks: [...t.subtasks, newSub] };
      })
    );
    setSubtaskTitle('');
    setSubtaskDescription('');
    setSubtaskParentIdx(null);
    // After state updates, move focus to the newly added subtask checkbox so the user knows it was added
    setTimeout(() => {
      const checkbox = document.getElementById(`sub-done-${subtaskParentIdx}-${newIdx}`);
      checkbox?.focus();
    }, 0);
  };

  return (
    <Box component="section" sx={{ p: 2, maxWidth: 600, mx: "auto" }}>
      <Typography variant="h4" component="h1" gutterBottom>
        To‑Do List
      </Typography>

      {/* New task entry form */}
      <Box component="form" onSubmit={handleAddTask} sx={{ mb: 2 }}>
        <TextField
          id="title"
          label="Title"
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          fullWidth
          margin="normal"
        />
        <TextField
          id="description"
          label="Description (optional)"
          placeholder="Task description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          multiline
          rows={2}
          fullWidth
          margin="normal"
        />
        <Button type="submit" variant="contained" sx={{ mt: 1 }}>
          Add Task
        </Button>
      </Box>
      {/* Placeholder when no tasks exist */}
      {tasks.length === 0 && (
        <Typography component="p" sx={{ mt: 2, textAlign: 'center', color: 'text.secondary' }}>
          No tasks yet. Add one above!
        </Typography>
      )}

      {/* List of tasks */}
      {tasks.length > 0 && (
        <List component="ul" disablePadding>
          {tasks.map((task, idx) => {
            const titleId = `task-title-${idx}`;
            const descId = `task-desc-${idx}`;
            const checkboxId = `task-done-${idx}`;
            return (
              <Box
                key={idx}
                component="li"
                aria-labelledby={titleId}
                aria-describedby={task.description ? descId : undefined}
                sx={{ mb: 2, border: "1px solid #ddd", borderRadius: 1, p: 2 }}>
                <Box display="flex" alignItems="center">
                  <Checkbox
                    id={checkboxId}
                    checked={task.done}
                    onChange={() => toggleDone(idx)}
                    inputProps={{ 'aria-label': 'task done' }}
                  />
                  <Typography
                    id={titleId}
                    component="span"
                    variant="h6"
                    sx={{ textDecoration: task.done ? 'line-through' : 'none' }}>
                    {task.title}
                  </Typography>
                </Box>
                {task.description && (
                  <Typography
                    id={descId}
                    variant="body2"
                    sx={{ ml: 4, textDecoration: task.done ? 'line-through' : 'none' }}>
                    {task.description}
                  </Typography>
                )}
                {/* Subtasks */}
                {task.subtasks && task.subtasks.length > 0 && (
                  <List component="ul" disablePadding sx={{ pl: 2, mt: 1 }}>
                    {task.subtasks.map((sub, sIdx) => {
                      const subTitleId = `sub-title-${idx}-${sIdx}`;
                      const subDescId = `sub-desc-${idx}-${sIdx}`;
                      const subCheckboxId = `sub-done-${idx}-${sIdx}`;
                      return (
                        <Box key={sIdx} component="li" aria-labelledby={subTitleId} aria-describedby={sub.description ? subDescId : undefined} sx={{ mb: 1 }}>
                          <Box display="flex" alignItems="center">
                            <Checkbox
                              id={subCheckboxId}
                              checked={sub.done}
                              onChange={() => toggleSubtaskDone(idx, sIdx)}
                              inputProps={{ 'aria-label': 'subtask done' }}
                            />
                            <Typography id={subTitleId} component="span" variant="body1" sx={{ textDecoration: sub.done ? 'line-through' : 'none' }}>
                              {sub.title}
                            </Typography>
                          </Box>
                          {sub.description && (
                            <Typography id={subDescId} variant="body2" sx={{ ml: 4, textDecoration: sub.done ? 'line-through' : 'none' }}>
                              {sub.description}
                            </Typography>
                          )}
                        </Box>
                      );
                    })}
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
          })}
        </List>
      )}
    </Box>
  );
}

export default App;