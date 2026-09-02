import { useState } from 'react';

/**
 * The in‑progress drag‑and‑drop reorder of the task list (HTML5 drag
 * events on the drag handles): the dragged task's id plus the row
 * currently hovered and which half of it (so the list can paint a drop
 * indicator). `null` means no drag in progress.
 *
 * `reorderTask` performs the actual move (the app passes the useTasks
 * mutation); this hook owns the hover/indicator state only.
 *
 * Returns `{ dragTask, start, over, drop, end }`:
 *   dragTask – the in‑progress drag `{ id, overId, after }` or `null`
 *   start – a drag started on a task's handle
 *   over – the pointer is over another row (updates the drop indicator,
 *           skipping the re‑render when nothing changed)
 *   drop – a drop on a row: move the dragged task before/after that row,
 *          then end the drag
 *   end – the drag ended (drop or cancel): clear the indicator either way
 */
export function useTaskDragReorder(reorderTask) {
  const [dragTask, setDragTask] = useState(null);

  const start = (id) => setDragTask({ id, overId: null, after: false });

  const over = (overId, after) => {
    setDragTask((prev) => {
      if (!prev || prev.id === overId) return prev;
      if (prev.overId === overId && prev.after === after) return prev;
      return { ...prev, overId, after };
    });
  };

  const drop = (overId, after) => {
    if (dragTask && dragTask.id !== overId) {
      reorderTask(dragTask.id, overId, after);
    }
    setDragTask(null);
  };

  const end = () => setDragTask(null);

  return { dragTask, start, over, drop, end };
}
