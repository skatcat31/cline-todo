import { useRef, useState } from 'react';
import { parseTasksFile } from '../utils/taskFile.js';
import { mergeTasks } from '../utils/taskList.js';

/**
 * The JSON import flow: reading a chosen file, validating it, and either
 * replacing the list or merging the imported tasks into it.
 *
 * Returns `{ pendingImport, error, clearError, fileInputRef, openPicker,
 * handleFileChange, cancel, replace, merge }`:
 *   pendingImport – a valid import waiting for the user’s decision
 *                   (replace or merge); `null` means the confirmation
 *                   dialog is closed
 *   error – whether the last import attempt failed (bad file contents)
 *   clearError – clear that flag (the error prompt’s close handler)
 *   fileInputRef – ref for the (hidden) file input the app renders
 *   openPicker – open the file picker
 *   handleFileChange – the input's onChange handler
 *   cancel – close the dialog without importing
 *   replace – replace the list with the imported tasks
 *   merge – keep the current tasks and add the imported ones
 */
export function useTaskImport(tasks, replaceTasks) {
  const [pendingImport, setPendingImport] = useState(null);
  const [error, setError] = useState(false);
  // Hidden file input used by the "Import tasks" button.
  const fileInputRef = useRef(null);

  const openPicker = () => fileInputRef.current?.click();

  // Read the chosen file, validate it, and route it: an empty list is
  // replaced without asking; otherwise the user decides between replacing
  // the list and merging the import into it, so importing never destroys
  // existing tasks silently. The input value is reset so the same file
  // can be imported again.
  const handleFileChange = async (e) => {
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
      setError(true);
      return;
    }
    setError(false);
    if (tasks.length === 0) {
      replaceTasks(parsed);
    } else {
      setPendingImport(parsed);
    }
  };

  // Clear the error flag (the error prompt’s auto‑hide / close handler).
  const clearError = () => setError(false);

  const cancel = () => setPendingImport(null);

  // Replace the whole list with the imported tasks.
  const replace = () => {
    if (!pendingImport) return;
    replaceTasks(pendingImport);
    setPendingImport(null);
  };

  // Keep the current tasks and append the imported ones that do not
  // already exist (matched by id), so merging never duplicates or
  // overwrites.
  const merge = () => {
    if (!pendingImport) return;
    replaceTasks(mergeTasks(tasks, pendingImport));
    setPendingImport(null);
  };

  return {
    pendingImport,
    error,
    clearError,
    fileInputRef,
    openPicker,
    handleFileChange,
    cancel,
    replace,
    merge,
  };
}
