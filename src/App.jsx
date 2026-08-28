import { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
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
    clearCompleted,
  } = useTasks();
  // Controlled input state for new task
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // Which list to show: "all", "active" or "completed"
  const [filter, setFilter] = useState('all');

  // Handle adding a new top‑level task
  const handleAddTask = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    addTask(title, description);
    setTitle('');
    setDescription('');
  };

  // The task list as shown by the active filter
  const visibleTasks =
    filter === 'all'
      ? tasks
      : tasks.filter((task) =>
          filter === 'completed' ? task.done : !task.done,
        );
  const activeCount = tasks.filter((task) => !task.done).length;
  const completedCount = tasks.length - activeCount;

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

        {/* Filter bar: All / Active / Completed, a counter and
            "clear completed" (only shown while tasks exist) */}
        {tasks.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <ButtonGroup size="small" aria-label="Filter tasks">
              <Button
                variant={filter === 'all' ? 'contained' : 'text'}
                aria-pressed={filter === 'all'}
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                variant={filter === 'active' ? 'contained' : 'text'}
                aria-pressed={filter === 'active'}
                onClick={() => setFilter('active')}
              >
                Active
              </Button>
              <Button
                variant={filter === 'completed' ? 'contained' : 'text'}
                aria-pressed={filter === 'completed'}
                onClick={() => setFilter('completed')}
              >
                Completed
              </Button>
            </ButtonGroup>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ flexGrow: 1, textAlign: 'center' }}
              aria-live="polite"
            >
              {`${activeCount} of ${tasks.length} ${
                tasks.length === 1 ? 'task' : 'tasks'
              } active`}
            </Typography>
            {completedCount > 0 && (
              <Button size="small" color="error" onClick={clearCompleted}>
                Clear completed
              </Button>
            )}
          </Box>
        )}

        {/* Placeholder when no tasks exist */}
        {tasks.length === 0 && <Placeholder />}

        {/* Hint when the active filter has no matching tasks */}
        {tasks.length > 0 && visibleTasks.length === 0 && (
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ my: 3, textAlign: 'center' }}
          >
            {filter === 'active'
              ? 'No active tasks – nice work!'
              : 'No completed tasks yet.'}
          </Typography>
        )}

        {/* List of tasks, presented on a shared paper surface with
            Material list dividers between items */}
        {visibleTasks.length > 0 && (
          <Card elevation={1} sx={{ mb: 3 }}>
            <List component="ul" disablePadding>
              {visibleTasks.map((task) => (
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
