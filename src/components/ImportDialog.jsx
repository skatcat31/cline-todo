import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';

/**
 * Confirmation shown before an import may replace the current list: the
 * user picks between replacing it and merging the imported tasks into it.
 * Rendered (by the app) only while an import is pending.
 * Props:
 *   taskCount - how many tasks the imported file contains
 *   onCancel - close the dialog without importing
 *   onMerge - keep the current tasks and add the imported ones
 *   onReplace - replace the current list with the imported tasks
 */
export default function ImportDialog({
  taskCount,
  onCancel,
  onMerge,
  onReplace,
}) {
  return (
    <Dialog open onClose={onCancel} aria-labelledby="import-dialog-title">
      <DialogTitle id="import-dialog-title">Import tasks?</DialogTitle>
      <DialogContent>
        <Typography component="p" color="text.secondary">
          This file contains {taskCount === 1 ? '1 task' : `${taskCount} tasks`}
          .
        </Typography>
        <Typography component="p" color="text.secondary">
          Replacing removes your current tasks (export them first if you need a
          copy); merging keeps your tasks and adds the imported ones, skipping
          tasks whose id already exists.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={onMerge} variant="outlined">
          Merge into list
        </Button>
        <Button onClick={onReplace} variant="contained" color="warning">
          Replace list
        </Button>
      </DialogActions>
    </Dialog>
  );
}
