import { useEffect, useMemo, useRef, useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CssBaseline from '@mui/material/CssBaseline';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { ThemeProvider } from '@mui/material/styles';
import FileDownload from '@mui/icons-material/FileDownload';
import FileUpload from '@mui/icons-material/FileUpload';
import DarkMode from '@mui/icons-material/DarkMode';
import LightMode from '@mui/icons-material/LightMode';
import Placeholder from './components/Placeholder.jsx';
import TaskItem from './components/TaskItem.jsx';
import { useTasks } from './hooks/useTasks.js';
import { createAppTheme } from './theme.js';
import { downloadTasks, parseTasksFile } from './utils/taskFile.js';

// localStorage key under which the active filter is remembered, plus the set
// of values that key may legally hold (anything else falls back to "all").
const FILTER_KEY = 'todo-filter';
const FILTERS = ['all', 'active', 'completed'];

// localStorage key for the color scheme preference.
const THEME_KEY = 'todo-theme';

/**
 * Initial color scheme: an explicit user choice wins; otherwise follow the
 * OS preference when the browser exposes it; default to light.
 */
function initialThemeMode() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // storage unavailable – fall through
  }
  if (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark';
  }
  return 'light';
}

// A simple To Do application allowing users to add tasks with a title and
// description. Task state, mutations and persistence live in the `useTasks`
// hook; this component owns the "new task" form and the layout only.
function App() {
  const {
    tasks,
    persistFailed,
    addTask,
    toggleTask,
    deleteTask,
    insertTask,
    editTask,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    editSubtask,
    clearCompleted,
    replaceTasks,
  } = useTasks();
  // Controlled input state for new task
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // Which list to show: "all", "active" or "completed" – remembered in
  // localStorage so a reload restores the previous view.
  const [filter, setFilter] = useState(() => {
    try {
      const stored = localStorage.getItem(FILTER_KEY);
      return FILTERS.includes(stored) ? stored : 'all';
    } catch {
      return 'all';
    }
  });
  // The most recently deleted task plus its position, so a delete can be
  // undone from the snackbar. `null` means there is nothing to undo.
  const [deletedTask, setDeletedTask] = useState(null);
  // Whether the last import attempt failed (bad file contents).
  const [importError, setImportError] = useState(false);
  // Ref to the new‑task title field so focus can fall back to it when the
  // whole list becomes empty after a delete.
  const titleInputRef = useRef(null);
  // Hidden file input used by the "Import tasks" button.
  const fileInputRef = useRef(null);
  // Color scheme: "light" or "dark". The lazy initializer picks an explicit
  // user choice, then the OS preference, then light (see initialThemeMode).
  const [mode, setMode] = useState(initialThemeMode);

  // Remember the active filter (best effort – storage may be unavailable).
  useEffect(() => {
    try {
      localStorage.setItem(FILTER_KEY, filter);
    } catch {
      // ignore – the filter simply will not be persisted
    }
  }, [filter]);

  // Remember the color scheme (best effort – storage may be unavailable).
  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, mode);
    } catch {
      // ignore – the theme simply will not be persisted
    }
  }, [mode]);

  // Build the theme only when the mode actually changes.
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  // Handle adding a new top‑level task
  const handleAddTask = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    addTask(title, description);
    setTitle('');
    setDescription('');
  };

  // Delete a task but remember it (with its position) so the snackbar can
  // offer an undo. Also keeps keyboard focus inside the list: it moves to
  // the task that now occupies the deleted task's position, or to the
  // new‑task title field when the list becomes empty.
  const handleDeleteTask = (id) => {
    const index = tasks.findIndex((task) => task.id === id);
    const task = tasks[index];
    const remaining = tasks.filter((t) => t.id !== id);
    deleteTask(id);
    setDeletedTask({ task, index });
    const target = remaining[Math.min(index, remaining.length - 1)];
    const targetElement = target
      ? document.getElementById(`done-${target.id}`)
      : null;
    (targetElement ?? titleInputRef.current)?.focus();
  };

  // Re‑insert the deleted task at its original position.
  const handleUndoDelete = () => {
    if (!deletedTask) return;
    insertTask(deletedTask.task, deletedTask.index);
    setDeletedTask(null);
  };

  const closeUndoSnackbar = () => setDeletedTask(null);

  // Open the hidden file picker for importing a task list.
  const handleImportClick = () => fileInputRef.current?.click();

  // Read the chosen file, validate it, and replace the list when valid.
  // The input value is reset so the same file can be imported again.
  const handleImportChange = async (e) => {
    const input = e.target;
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    let parsed = null;
    try {
      parsed = parseTasksFile(await file.text());
    } catch {
      parsed = null;
    }
    if (parsed === null) {
      setImportError(true);
      return;
    }
    setImportError(false);
    replaceTasks(parsed);
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
    <ThemeProvider theme={theme}>
      {/* CssBaseline resets browser styles and applies the theme's
          typography, color scheme and background – the standard
          Material Design document baseline. It lives here (instead of in
          main.jsx) so it always matches the active color scheme. */}
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
        {/* Material app bar with the application title and, on the right,
          export/import actions (export only makes sense with tasks present) */}
        <AppBar position="sticky" elevation={1}>
          <Toolbar>
            <Typography variant="h6" component="h1" noWrap sx={{ flexGrow: 1 }}>
              To‑Do List
            </Typography>
            {tasks.length > 0 && (
              <IconButton
                color="inherit"
                aria-label="Export tasks"
                onClick={() => downloadTasks(tasks)}
              >
                <FileDownload fontSize="small" />
              </IconButton>
            )}
            <IconButton
              color="inherit"
              aria-label="Import tasks"
              onClick={handleImportClick}
            >
              <FileUpload fontSize="small" />
            </IconButton>
            {/* Light/dark color‑scheme toggle; the choice is persisted */}
            <IconButton
              color="inherit"
              aria-label={
                mode === 'light'
                  ? 'Switch to dark mode'
                  : 'Switch to light mode'
              }
              onClick={() => setMode(mode === 'light' ? 'dark' : 'light')}
            >
              {mode === 'light' ? (
                <DarkMode fontSize="small" />
              ) : (
                <LightMode fontSize="small" />
              )}
            </IconButton>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={handleImportChange}
            />
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
                  inputRef={titleInputRef}
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
                    onDelete={handleDeleteTask}
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

        {/* Error prompt shown after a failed import; auto‑disappears */}
        <Snackbar
          open={importError}
          autoHideDuration={6000}
          onClose={() => setImportError(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{ mb: 2 }}
        >
          <Alert severity="error">
            Import failed – the file is not a valid task list.
          </Alert>
        </Snackbar>

        {/* Undo prompt after a task was deleted: the task (and its position)
          are kept in state and re‑inserted when "Undo" is pressed. The
          snackbar auto‑disappears after a few seconds. */}
        <Snackbar
          open={Boolean(deletedTask)}
          autoHideDuration={6000}
          onClose={closeUndoSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{ mb: 2 }}
        >
          <Alert
            severity="info"
            variant="filled"
            onClose={closeUndoSnackbar}
            action={
              <Button color="inherit" size="small" onClick={handleUndoDelete}>
                Undo
              </Button>
            }
          >
            {deletedTask ? `Deleted "${deletedTask.task.title}"` : ''}
          </Alert>
        </Snackbar>

        {/* Warning shown while a persistence attempt has failed (storage full
          or unavailable): the list still works, but changes may not survive
          a reload. It stays visible until the next successful write. */}
        <Snackbar
          open={persistFailed}
          autoHideDuration={null}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          sx={{ mt: 8 }}
        >
          <Alert severity="warning">
            Tasks could not be saved to this browser – changes may be lost.
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}

export default App;
