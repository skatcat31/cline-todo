// Shared style for the snackbars: a MUI snackbar's root element spans the
// full viewport width, and while it is pointer‑opaque it (a) swallows
// clicks on the UI behind that strip and (b) pauses the auto‑hide timer
// as soon as the pointer is anywhere over the strip – which sticks the
// snackbar open whenever it opens under a stationary cursor. Keep the
// root pointer‑transparent and only the alert box itself interactive.
export const SNACKBAR_SX = {
  pointerEvents: 'none',
  '& .MuiAlert-root': { pointerEvents: 'auto' },
};
