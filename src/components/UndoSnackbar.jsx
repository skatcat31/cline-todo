import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import { SNACKBAR_SX } from './snackbarSx.js';

// The snackbar message for a stack entry (a single delete names the
// task, bulk removals use a count).
const undoDescription = (items) =>
  items.length === 1
    ? `Deleted "${items[0].task.title}"`
    : `Deleted ${items.length} tasks`;

/**
 * The undo prompt shown after deletions: each removed task (or "clear
 * completed") pushes an entry onto a stack (most recent last); "Undo"
 * re‑inserts the newest entry and the snackbar then offers the previous
 * one until the stack is empty. The changing key restarts the auto‑hide
 * timer for every entry: auto‑hide only drops the newest one, so each
 * pending undo gets its own 6‑second window instead of the whole stack
 * expiring at once.
 * Props:
 *   stack - the undoable actions, oldest first (each entry holds the
 *           removed tasks, their list and a stamp); empty = nothing to
 *           undo
 *   onUndo - re‑inserts the most recent entry (the Undo button)
 *   onClose - receives (event, reason) when the snackbar closes; the
 *             reason decides what the app drops from the stack
 */
export default function UndoSnackbar({ stack, onUndo, onClose }) {
  const latest = stack.length > 0 ? stack[stack.length - 1] : null;
  return (
    <Snackbar
      key={latest ? latest.stamp : 'no-undo'}
      open={latest !== null}
      autoHideDuration={6000}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{ mb: 2, ...SNACKBAR_SX }}
    >
      <Alert
        severity="info"
        variant="filled"
        onClose={onClose}
        action={
          <Button color="inherit" size="small" onClick={onUndo}>
            Undo
          </Button>
        }
      >
        {latest ? undoDescription(latest.items) : ''}
      </Alert>
    </Snackbar>
  );
}
