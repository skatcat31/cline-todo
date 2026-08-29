import { useMemo, useRef, useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CssBaseline from '@mui/material/CssBaseline';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import Snackbar from '@mui/material/Snackbar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { ThemeProvider } from '@mui/material/styles';
import FileDownload from '@mui/icons-material/FileDownload';
import FileUpload from '@mui/icons-material/FileUpload';
import FilterBar from './components/FilterBar.jsx';
import NewTaskForm from './components/NewTaskForm.jsx';
import Placeholder from './components/Placeholder.jsx';
import TaskItem from './components/TaskItem.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import { usePersistentState } from './hooks/usePersistentState.js';
import { useTasks } from './hooks/useTasks.js';
import { createAppTheme } from './theme.js';
import { FILTERS } from './utils/filters.js';
import { downloadTasks, parseTasksFile } from './utils/taskFile.js';

// localStorage key under which the active filter is remembered (the legal
// values are the entries of FILTERS, imported from utils/filters.js;
// anything else falls back to "all").
const FILTER_KEY = 'todo-filter';

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
    insertTasks,
    editTask,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    editSubtask,
    clearCompleted,
    replaceTasks,
  } = useTasks();
  // Which list to show: "all", "active" or "completed" – remembered in
  // localStorage (via usePersistentState) so a reload restores the
  // previous view.
  const [filter, setFilter] = usePersistentState(FILTER_KEY, () => {
    try {
      const stored = localStorage.getItem(FILTER_KEY);
      return FILTERS.some((f) => f.value === stored) ? stored : 'all';
    } catch {
      return 'all';
    }
  });
  // Tasks (with their original positions) that can still be undone: one
  // entry per removed task, so both single deletes and "clear completed"
  // offer an undo from the snackbar. `null` means nothing to undo.
  const [pendingUndo, setPendingUndo] = useState(null);
  // A valid import waiting for the user’s decision (replace or merge);
  // `null` means the confirmation dialog is closed.
  const [pendingImport, setPendingImport] = useState(null);
  // Whether the last import attempt failed (bad file contents).
  const [importError, setImportError] = useState(false);
  // Ref to the new‑task title field so focus can fall back to it when the
  // whole list becomes empty after a delete.
  const titleInputRef = useRef(null);
  // Task whose checkbox should receive focus after a delete: the task
  // that now occupies the deleted task's position. The changing stamp
  // re-triggers the focus effect for repeat deletes; null means
  // "no focus request".
  const [focusTask, setFocusTask] = useState(null);
  // Hidden file input used by the "Import tasks" button.
  const fileInputRef = useRef(null);
  // Color scheme: "light" or "dark" – remembered in localStorage (via
  // usePersistentState); the lazy initializer picks an explicit user
  // choice, then the OS preference, then light (see initialThemeMode).
  const [mode, setMode] = usePersistentState(THEME_KEY, initialThemeMode);

  // Build the theme only when the mode actually changes.
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  // Handle adding a new top‑level task (NewTaskForm owns the draft
  // fields and calls this with their values).
  const handleAddTask = ({ title, description }) => {
    addTask(title, description);
  };

  // Delete a task but remember it (with its position) so the snackbar can
  // offer an undo. Also keeps keyboard focus inside the list: it moves to
  // the task that now occupies the deleted task's position (TaskItem
  // focuses its own checkbox when focusToken points at it), or to the
  // new‑task title field when the list becomes empty.
  const handleDeleteTask = (id) => {
    const index = tasks.findIndex((task) => task.id === id);
    const task = tasks[index];
    const remaining = tasks.filter((t) => t.id !== id);
    deleteTask(id);
    setPendingUndo({ items: [{ task, index }] });
    const target = remaining[Math.min(index, remaining.length - 1)];
    if (target) {
      setFocusTask({ id: target.id, stamp: Date.now() });
    } else {
      // The list is now empty – restore focus to the new‑task title field.
      setFocusTask(null);
      titleInputRef.current?.focus();
    }
  };

  // Re‑insert all undone tasks at their original positions.
  const handleUndo = () => {
    if (!pendingUndo) return;
    insertTasks(pendingUndo.items);
    setPendingUndo(null);
  };

  const closeUndoSnackbar = () => setPendingUndo(null);

  // Remove every completed task and remember it (with its position) so
  // the snackbar can offer an undo, like for single deletes.
  const handleClearCompleted = () => {
    const removed = tasks
      .map((task, index) => ({ task, index }))
      .filter(({ task }) => task.done);
    clearCompleted();
    if (removed.length > 0) setPendingUndo({ items: removed });
  };

  // Open the hidden file picker for importing a task list.
  const handleImportClick = () => fileInputRef.current?.click();

  // Read the chosen file, validate it, and replace the list when valid.
  // The input value is reset so the same file can be imported again.
  const handleImportChange = async (e) => {
    const input = e.target;
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    let parsed;
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
    // An empty list can be replaced without asking; otherwise the user
    // decides between replacing the list and merging the import into it,
    // so importing never destroys existing tasks silently.
    if (tasks.length === 0) {
      replaceTasks(parsed);
    } else {
      setPendingImport(parsed);
    }
  };

  const closeImportDialog = () => setPendingImport(null);

  // Replace the whole list with the imported tasks.
  const handleImportReplace = () => {
    if (!pendingImport) return;
    replaceTasks(pendingImport);
    setPendingImport(null);
  };

  // Keep the current tasks and append the imported ones that do not
  // already exist (matched by id), so merging never duplicates or
  // overwrites.
  const handleImportMerge = () => {
    if (!pendingImport) return;
    const existingIds = new Set(tasks.map((task) => task.id));
    const merged = [
      ...tasks,
      ...pendingImport.filter((task) => !existingIds.has(task.id)),
    ];
    replaceTasks(merged);
    setPendingImport(null);
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
            <ThemeToggle
              mode={mode}
              onToggle={() => setMode(mode === 'light' ? 'dark' : 'light')}
            />
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
          {/* New task entry form (NewTaskForm owns the draft state); the
              title field ref lets the app restore focus to it */}
          <NewTaskForm
            onAddTask={handleAddTask}
            titleFieldRef={titleInputRef}
          />

          {/* Filter bar: All / Active / Completed, a counter and
            "clear completed" (only shown while tasks exist) */}
          {tasks.length > 0 && (
            <FilterBar
              filter={filter}
              onFilterChange={setFilter}
              activeCount={activeCount}
              totalCount={tasks.length}
              completedCount={completedCount}
              onClearCompleted={handleClearCompleted}
            />
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
                    focusToken={
                      focusTask && focusTask.id === task.id
                        ? focusTask.stamp
                        : null
                    }
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
          open={Boolean(pendingUndo)}
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
              <Button color="inherit" size="small" onClick={handleUndo}>
                Undo
              </Button>
            }
          >
            {pendingUndo
              ? pendingUndo.items.length === 1
                ? `Deleted "${pendingUndo.items[0].task.title}"`
                : `Deleted ${pendingUndo.items.length} tasks`
              : ''}
          </Alert>
        </Snackbar>

        {/* Confirmation before an import may replace the current list: the
          user picks between replacing it and merging the imported tasks
          into it. */}
        <Dialog
          open={Boolean(pendingImport)}
          onClose={closeImportDialog}
          aria-labelledby="import-dialog-title"
        >
          <DialogTitle id="import-dialog-title">Import tasks?</DialogTitle>
          <DialogContent>
            <Typography component="p" color="text.secondary">
              This file contains{' '}
              {pendingImport &&
                (pendingImport.length === 1
                  ? '1 task'
                  : `${pendingImport.length} tasks`)}
              .
            </Typography>
            <Typography component="p" color="text.secondary">
              Replacing removes your current tasks (export them first if you
              need a copy); merging keeps your tasks and adds the imported ones,
              skipping tasks whose id already exists.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeImportDialog}>Cancel</Button>
            <Button onClick={handleImportMerge} variant="outlined">
              Merge into list
            </Button>
            <Button
              onClick={handleImportReplace}
              variant="contained"
              color="warning"
            >
              Replace list
            </Button>
          </DialogActions>
        </Dialog>

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
