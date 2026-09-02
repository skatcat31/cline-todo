import { useRef, useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CssBaseline from '@mui/material/CssBaseline';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import Snackbar from '@mui/material/Snackbar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { ThemeProvider } from '@mui/material/styles';
import FileDownload from '@mui/icons-material/FileDownload';
import FileUpload from '@mui/icons-material/FileUpload';
import NotificationsActive from '@mui/icons-material/NotificationsActive';
import NotificationsNone from '@mui/icons-material/NotificationsNone';
import FilterBar from './components/FilterBar.jsx';
import ImportDialog from './components/ImportDialog.jsx';
import ListTabs from './components/ListTabs.jsx';
import NewTaskForm from './components/NewTaskForm.jsx';
import PersistWarning from './components/PersistWarning.jsx';
import Placeholder from './components/Placeholder.jsx';
import SearchBar from './components/SearchBar.jsx';
import TaskItem from './components/TaskItem.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import UndoSnackbar from './components/UndoSnackbar.jsx';
import { SNACKBAR_SX } from './components/snackbarSx.js';
import { useColorScheme } from './hooks/useColorScheme.js';
import { useDueDateReminders } from './hooks/useDueDateReminders.js';
import { usePersistentState } from './hooks/usePersistentState.js';
import { useTaskDragReorder } from './hooks/useTaskDragReorder.js';
import { useTaskImport } from './hooks/useTaskImport.js';
import { useTasks } from './hooks/useTasks.js';
import { useUndoStack } from './hooks/useUndoStack.js';
import { FILTERS } from './utils/filters.js';
import { downloadTasks } from './utils/taskFile.js';
import {
  completedItems,
  indexOfTask,
  sortTasksByDue,
  tasksMatching,
  taskCounts,
  visibleTasks,
} from './utils/taskList.js';

// localStorage key under which the active filter is remembered (the legal
// values are the entries of FILTERS, imported from utils/filters.js;
// anything else falls back to "all").
const FILTER_KEY = 'todo-filter';

// localStorage key under which the active sort is remembered (the legal
// values are "none" – the manual list order – and "due" – earliest due
// date first; anything else falls back to "none").
const SORT_KEY = 'todo-sort';

// A simple To Do application allowing users to add tasks with a title and
// description. Task state, mutations and persistence live in the `useTasks`
// hook; this component owns the "new task" form and the layout only.
function App() {
  const {
    tasks,
    lists,
    activeListId,
    persistFailed,
    addList,
    renameList,
    deleteList,
    selectList,
    addTask,
    toggleTask,
    deleteTask,
    moveTask,
    reorderTask,
    insertTasks,
    editTask,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    editSubtask,
    clearCompleted,
    replaceTasks,
  } = useTasks();
  // Local due‑date reminders: with the notification permission granted
  // (and the feature switched on), the hook announces the tasks that are
  // due today – once per day per task. The app‑bar button asks for the
  // permission or toggles the on/off choice.
  const { permission, enabled, requestPermission, toggleEnabled } =
    useDueDateReminders(tasks);
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
  // Whether the list is shown in due‑date order instead of the manual
  // list order – remembered across reloads, like the filter.
  const [sort, setSort] = usePersistentState(SORT_KEY, () => {
    try {
      return localStorage.getItem(SORT_KEY) === 'due' ? 'due' : 'none';
    } catch {
      return 'none';
    }
  });
  const sortActive = sort === 'due';
  // Manual reordering (move up/down, drag and drop) only makes sense in
  // the manual list order; while the due‑date sort is on it would be
  // hidden by the derived ordering, so the controls are disabled.
  const canReorder = !sortActive;
  // The current search query: a transient view filter (title, description
  // or subtask title), unlike the status filter it is not persisted.
  const [search, setSearch] = useState('');
  // Multi‑level undo for deletions: the hook owns the stack, the entry
  // cap and how a snackbar dismissal is interpreted; the app decides what
  // is undoable (handleDeleteTask / handleClearCompleted) and hands the
  // re‑insertion to useTasks.
  const {
    stack: undoStack,
    push: pushUndo,
    undo: handleUndo,
    close: closeUndoSnackbar,
  } = useUndoStack(insertTasks);
  // Ref to the new‑task title field so focus can fall back to it when the
  // whole list becomes empty after a delete.
  const titleInputRef = useRef(null);
  // Task whose checkbox should receive focus after a delete: the task
  // that now occupies the deleted task's position. The changing stamp
  // re-triggers the focus effect for repeat deletes; null means
  // "no focus request".
  const [focusTask, setFocusTask] = useState(null);
  // The JSON import flow (file reading, validation, the replace/merge
  // decision): the hook owns the pending import, the error flag and the
  // hidden file input; replaceTasks performs the mutation.
  const {
    pendingImport,
    error: importError,
    clearError: clearImportError,
    fileInputRef,
    openPicker: handleImportClick,
    handleFileChange: handleImportChange,
    cancel: closeImportDialog,
    replace: handleImportReplace,
    merge: handleImportMerge,
  } = useTaskImport(tasks, replaceTasks);
  // Color scheme: "light", "system" (follow the OS) or "dark"; the hook
  // persists the choice, tracks the OS preference live in "system" mode and
  // hands back the concrete MUI theme for the effective scheme.
  const { mode, setMode, theme } = useColorScheme();

  // Handle adding a new top‑level task (NewTaskForm owns the draft
  // fields and calls this with their values).
  const handleAddTask = ({ title, description, due }) => {
    addTask(title, description, due);
  };

  // Delete a task but remember it (with its position) so the snackbar can
  // offer an undo. Also keeps keyboard focus inside the list: it moves to
  // the task that now occupies the deleted task's position (TaskItem
  // focuses its own checkbox when focusToken points at it), or to the
  // new‑task title field when the list becomes empty.
  const handleDeleteTask = (id) => {
    const index = indexOfTask(tasks, id);
    // The task may already be gone when this handler runs (a cross‑tab
    // sync can remove it right after the row was rendered): then there is
    // nothing to delete, and no undo entry to remember either.
    if (index === -1) return;
    const task = tasks[index];
    const remaining = tasks.filter((t) => t.id !== id);
    deleteTask(id);
    pushUndo([{ task, index }], activeListId);
    const target = remaining[Math.min(index, remaining.length - 1)];
    if (target) {
      setFocusTask({ id: target.id, stamp: Date.now() });
    } else {
      // The list is now empty – restore focus to the new‑task title field.
      setFocusTask(null);
      titleInputRef.current?.focus();
    }
  };

  // Move a task one row up/down within the *currently visible* list (the
  // filter may hide other tasks, so the neighbour is computed on the shown
  // list, not the full list – the reducer swaps the two full-list entries).
  const handleMoveTask = (id, direction) => {
    const position = shownTasks.findIndex((task) => task.id === id);
    if (direction === 'up' && position > 0) {
      moveTask(id, shownTasks[position - 1].id);
    } else if (direction === 'down' && position < shownTasks.length - 1) {
      moveTask(id, shownTasks[position + 1].id);
    }
  };

  // The in‑progress drag‑and‑drop reorder: the hook owns the dragged
  // task / hover state (which drives the drop indicator); reorderTask
  // performs the actual move.
  const {
    dragTask,
    start: handleDragStartTask,
    over: handleDragOverTask,
    drop: handleDropTask,
    end: handleDragEndTask,
  } = useTaskDragReorder(reorderTask);

  // Remove every completed task and remember it (with its position) so
  // the snackbar can offer an undo, like for single deletes.
  const handleClearCompleted = () => {
    const removed = completedItems(tasks);
    clearCompleted();
    if (removed.length > 0) pushUndo(removed, activeListId);
  };

  // The task list as shown by the search query and the active filter, plus
  // the counters the filter bar shows (pure helpers from utils/taskList.js).
  // The tasks in the order shown in the list card: search and filter are
  // applied to the full list; the due‑date sort (when active) reorders
  // the result. It is a view order only – the stored manual order is
  // never changed by it.
  const shownTasks = sortActive
    ? sortTasksByDue(visibleTasks(tasksMatching(tasks, search), filter))
    : visibleTasks(tasksMatching(tasks, search), filter);
  const {
    active: activeCount,
    completed: completedCount,
    total: totalCount,
  } = taskCounts(tasks);

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
            {/* Due‑date reminders: without permission the click asks the
                browser for it (a user gesture is required); with
                permission it toggles the on/off choice. The filled icon
                marks the enabled state. */}
            <IconButton
              color="inherit"
              aria-label={
                permission === 'granted'
                  ? enabled
                    ? 'Turn off due‑date reminders'
                    : 'Turn on due‑date reminders'
                  : 'Enable due‑date reminders'
              }
              title="Remind me about tasks that are due today"
              disabled={permission === 'denied' || permission === 'unsupported'}
              onClick={() =>
                permission === 'granted' ? toggleEnabled() : requestPermission()
              }
            >
              {permission === 'granted' && enabled ? (
                <NotificationsActive fontSize="small" />
              ) : (
                <NotificationsNone fontSize="small" />
              )}
            </IconButton>
            {/* Color‑scheme selector (light / system / dark); the choice is
                persisted by useColorScheme */}
            <ThemeToggle mode={mode} onModeChange={setMode} />
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={handleImportChange}
            />
          </Toolbar>
          {/* List tabs + list management (create / rename / delete); the
              row is aligned with the content column below it. */}
          <Box
            component="nav"
            sx={{ maxWidth: 640, mx: 'auto', px: { xs: 2, sm: 3 }, pb: 1 }}
          >
            <ListTabs
              lists={lists}
              activeListId={activeListId}
              onSelect={selectList}
              onAdd={addList}
              onRename={renameList}
              onDelete={deleteList}
            />
          </Box>
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

          {/* Search box: filters the list by title, description or
              subtask title (only shown while tasks exist) */}
          {tasks.length > 0 && (
            <SearchBar value={search} onSearchChange={setSearch} />
          )}

          {/* Filter bar: All / Active / Completed, a counter and
            "clear completed" (only shown while tasks exist) */}
          {tasks.length > 0 && (
            <FilterBar
              filter={filter}
              onFilterChange={setFilter}
              sort={sort}
              onSortChange={setSort}
              activeCount={activeCount}
              totalCount={totalCount}
              completedCount={completedCount}
              onClearCompleted={handleClearCompleted}
            />
          )}

          {/* Placeholder when no tasks exist */}
          {tasks.length === 0 && <Placeholder />}

          {/* Hint when the active filter has no matching tasks */}
          {tasks.length > 0 && shownTasks.length === 0 && (
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ my: 3, textAlign: 'center' }}
            >
              {search.trim()
                ? `No tasks match "${search.trim()}".`
                : filter === 'active'
                  ? 'No active tasks – nice work!'
                  : 'No completed tasks yet.'}
            </Typography>
          )}

          {/* List of tasks, presented on a shared paper surface with
            Material list dividers between items */}
          {shownTasks.length > 0 && (
            <Card elevation={1} sx={{ mb: 3 }}>
              <List component="ul" disablePadding>
                {shownTasks.map((task, position) => (
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
                    canMoveUp={position > 0 && canReorder}
                    canMoveDown={position < shownTasks.length - 1 && canReorder}
                    onMoveUp={() => handleMoveTask(task.id, 'up')}
                    onMoveDown={() => handleMoveTask(task.id, 'down')}
                    canReorder={canReorder}
                    dragTask={dragTask}
                    onDragStartTask={handleDragStartTask}
                    onDragOverTask={handleDragOverTask}
                    onDropTask={handleDropTask}
                    onDragEndTask={handleDragEndTask}
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
          onClose={clearImportError}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{ mb: 2, ...SNACKBAR_SX }}
        >
          <Alert severity="error">
            Import failed – the file is not a valid task list.
          </Alert>
        </Snackbar>

        {/* Undo prompt after deletions: each removed task (or "clear
          completed") pushes an entry onto a stack (most recent last);
          "Undo" re‑inserts the newest entry and the snackbar then offers
          the previous one until the stack is empty. The changing key
          restarts the auto‑hide timer for every entry: auto‑hide only
          drops the newest one, so each pending undo gets its own
          6‑second window instead of the whole stack expiring at once. */}
        <UndoSnackbar
          stack={undoStack}
          onUndo={handleUndo}
          onClose={closeUndoSnackbar}
        />

        {/* Confirmation before an import may replace the current list: the
          user picks between replacing it and merging the imported tasks
          into it. */}
        {pendingImport && (
          <ImportDialog
            taskCount={pendingImport.length}
            onCancel={closeImportDialog}
            onMerge={handleImportMerge}
            onReplace={handleImportReplace}
          />
        )}

        {/* Warning shown while a persistence attempt has failed (storage full
          or unavailable): the list still works, but changes may not survive
          a reload. It stays visible until the next successful write. */}
        <PersistWarning open={persistFailed} />
      </Box>
    </ThemeProvider>
  );
}

export default App;
