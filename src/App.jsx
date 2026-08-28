import { useState } from 'react';
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
import { useTasks } from './hooks/useTasks.js';

// A simple To Do application allowing users to add tasks with a title and
// description. Task state, mutations and persistence live in the `useTasks`
// hook; this component owns the "new task" form and the layout only.
function App() {
  const {
    tasks,
    addTask,
    toggleTask,
    deleteTask,
    editTask,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    editSubtask,
  } = useTasks();
  // Controlled input state for new task
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Handle adding a new top‑level task
  const handleAddTask = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    addTask(title, description);
    setTitle('');
    setDescription('');
  };
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
                  onToggleDone={toggleTask}
                  onDelete={deleteTask}
                  onEdit={editTask}
                  onAddSubtask={addSubtask}
                  onToggleSubtask={toggleSubtask}
                  onDeleteSubtask={deleteSubtask}
                  onEditSubtask={editSubtask}
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
