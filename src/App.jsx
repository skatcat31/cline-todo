import React, { useState, useEffect } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import List from '@mui/material/List';
import TextField from '@mui/material/TextField';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Placeholder from './components/Placeholder.jsx';
import TaskItem from './components/TaskItem.jsx';

// A simple To Do application allowing users to add tasks with a title and description.
function App() {
  // State for the list of tasks
  const [tasks, setTasks] = useState([]);
  // State for adding a subtask to a specific parent task
  const [subtaskParentId, setSubtaskParentId] = useState(null);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [subtaskDescription, setSubtaskDescription] = useState('');
  // Controlled input state for new task
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // Tracks the id of the most recently added subtask so we can move focus to it
  const [focusTarget, setFocusTarget] = useState(null);

  // Handle adding a new top‑level task
  const handleAddTask = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const newTask = {
      id: crypto.randomUUID(),
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
  const toggleDone = (id) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  // Toggle done for a subtask given parent and subtask ids
  const toggleSubtaskDone = (parentId, subId) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== parentId) return t;
        const newSubs = t.subtasks.map((s) =>
          s.id === subId ? { ...s, done: !s.done } : s
        );
        return { ...t, subtasks: newSubs };
      })
    );
  };

  // Delete a top‑level task by its id
  const deleteTask = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // Delete a subtask (given parent and subtask ids) from its parent task
  const deleteSubtask = (parentId, subId) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === parentId
          ? { ...t, subtasks: t.subtasks.filter((s) => s.id !== subId) }
          : t
      )
    );
  };

  // Update a top‑level task's title and description by its id
  const editTask = (id, { title, description }) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, title: title.trim(), description: description.trim() }
          : t
      )
    );
  };

  // Update a subtask's title and description given parent and subtask ids
  const editSubtask = (parentId, subId, { title, description }) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== parentId) return t;
        const newSubs = t.subtasks.map((s) =>
          s.id === subId
            ? { ...s, title: title.trim(), description: description.trim() }
            : s
        );
        return { ...t, subtasks: newSubs };
      })
    );
  };


  // Handle adding a subtask to the currently selected parent
  const handleAddSubtask = (e) => {
    e.preventDefault();
    if (!subtaskTitle.trim()) return;
    const newSubId = crypto.randomUUID();
    const newSub = {
      id: newSubId,
      title: subtaskTitle.trim(),
      description: subtaskDescription.trim(),
      done: false,
    };
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== subtaskParentId) return t;
        return { ...t, subtasks: [...t.subtasks, newSub] };
      })
    );
    setSubtaskTitle('');
    setSubtaskDescription('');
    setSubtaskParentId(null);
    // Ask the focus effect (below) to move focus to the newly added subtask checkbox
    setFocusTarget(newSubId);
  };

  // Load tasks from storage on component mount
  useEffect(() => {
    const stored = localStorage.getItem('tasks');
    if (stored) {
      try {
        // Assume stored data is a valid tasks array.
        setTasks(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse tasks from storage', e);
      }
    }
  }, []);

  // Persist tasks to storage whenever they change
  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  // When a subtask is added, move focus to its checkbox once it has been rendered
  useEffect(() => {
    if (focusTarget === null) return;
    const checkbox = document.getElementById(`sub-done-${focusTarget}`);
    checkbox?.focus();
    setFocusTarget(null);
  }, [focusTarget]);
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* Material app bar with the application title */}
      <AppBar position="sticky" elevation={1}>
        <Toolbar>
          <Typography variant="h6" component="h1" noWrap sx={{ flexGrow: 1 }}>
            To‑Do List
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Main content surface, centered, using the 8pt spacing grid */}
      <Box
        component="main"
        sx={{ maxWidth: 640, mx: 'auto', px: { xs: 2, sm: 3 }, py: 3 }}
      >
        {/* New task entry form, presented as a Material card surface */}
        <Card elevation={2} sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" component="h2" gutterBottom>
              New Task
            </Typography>
            <Box component="form" onSubmit={handleAddTask}>
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
                label="Description"
                placeholder="Task description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                margin="normal"
              />
              <Button type="submit" variant="contained" sx={{ mt: 1 }}>
                Add Task
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Placeholder when no tasks exist */}
        {tasks.length === 0 && <Placeholder />}

        {/* List of tasks, presented on a shared paper surface with
            Material list dividers between items */}
        {tasks.length > 0 && (
          <Card elevation={1} sx={{ mb: 3 }}>
            <List component="ul" disablePadding>
              {tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  toggleDone={toggleDone}
                  deleteTask={deleteTask}
                  editTask={editTask}
                  toggleSubtaskDone={toggleSubtaskDone}
                  deleteSubtask={deleteSubtask}
                  editSubtask={editSubtask}
                  subtaskParentId={subtaskParentId}
                  setSubtaskParentId={setSubtaskParentId}
                  subtaskTitle={subtaskTitle}
                  setSubtaskTitle={setSubtaskTitle}
                  subtaskDescription={subtaskDescription}
                  setSubtaskDescription={setSubtaskDescription}
                  handleAddSubtask={handleAddSubtask}
                />
              ))}
            </List>
          </Card>
        )}
      </Box>
    </Box>
  );
}

export default App;

