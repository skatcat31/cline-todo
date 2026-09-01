import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { SNACKBAR_SX } from './snackbarSx.js';

/**
 * Warning shown while a persistence attempt has failed (storage full or
 * unavailable): the list still works, but changes may not survive a
 * reload. It stays visible until the next successful write.
 * Props:
 *   open - whether the warning is shown (the app flips it off once a
 *          write succeeds again)
 */
export default function PersistWarning({ open }) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={null}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      sx={{ mt: 8, ...SNACKBAR_SX }}
    >
      <Alert severity="warning">
        Tasks could not be saved to this browser – changes may be lost.
      </Alert>
    </Snackbar>
  );
}
