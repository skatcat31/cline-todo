import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
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

  // Handle adding a subtask to the currently selected parent
  const handleAddSubtask = (e) => {
    e.preventDefault();
    if (subtaskParentId === null) return;
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
            label="Description"
            placeholder="Task description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            margin="normal"
          />
          <Button type="submit" variant="contained" sx={{ mt: 1 }}
            >Add Task</Button>
       </Box>

       {/* Placeholder when no tasks exist */}
       {tasks.length === 0 && <Placeholder />}

       {/* List of tasks */}
       {tasks.length > 0 && (
         <List component="ul" disablePadding>
           {tasks.map((task) => (
             <TaskItem
               key={task.id}
               task={task}
               toggleDone={toggleDone}
               toggleSubtaskDone={toggleSubtaskDone}
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
        )}
      </Box>
    );
}

export default App;