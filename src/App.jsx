import React, { useState } from 'react';

// A simple To Do application allowing users to add tasks with a title and description.
function App() {
  // State for the list of tasks
  const [tasks, setTasks] = useState([]);
  // State for adding a subtask to a specific parent task
  const [subtaskParentIdx, setSubtaskParentIdx] = useState(null);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [subtaskDescription, setSubtaskDescription] = useState('');
  // Ref is no longer needed for persistent focus; we'll focus the newly added subtask checkbox instead
  // Controlled input state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const handleAddTask = (e) => {
    e.preventDefault();
    // Basic validation: require a title
    if (!title.trim()) return;
    const newTask = {
      title: title.trim(),
      description: description.trim(),
      done: false,
      subtasks: [],
    };
    setTasks((prev) => [...prev, newTask]);
    setTitle('');
    setDescription('');
  };

  // Toggle the "done" state of a task
  const toggleDone = (index) => {
    setTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, done: !t.done } : t))
    );
  };

  // Toggle done for a subtask given parent and subtask indexes
  const toggleSubtaskDone = (parentIdx, subIdx) => {
    setTasks((prev) =>
      prev.map((t, i) => {
        if (i !== parentIdx) return t;
        const newSubs = t.subtasks.map((s, si) =>
          si === subIdx ? { ...s, done: !s.done } : s
        );
        return { ...t, subtasks: newSubs };
      })
    );
  };

  // Handle adding a subtask to the currently selected parent
  const handleAddSubtask = (e) => {
    e.preventDefault();
    if (subtaskParentIdx === null) return;
    if (!subtaskTitle.trim()) return;
    const newSub = {
      title: subtaskTitle.trim(),
      description: subtaskDescription.trim(),
      done: false,
    };
    // Determine the index the new subtask will have (current length before addition)
    const newIdx = tasks[subtaskParentIdx]?.subtasks?.length ?? 0;
    setTasks((prev) =>
      prev.map((t, i) => {
        if (i !== subtaskParentIdx) return t;
        return { ...t, subtasks: [...t.subtasks, newSub] };
      })
    );
    // Reset subtask form state and close the form
    setSubtaskTitle('');
    setSubtaskDescription('');
    setSubtaskParentIdx(null);
    // After state updates, move focus to the newly added subtask checkbox so the user knows it was added
    setTimeout(() => {
      const checkbox = document.getElementById(`sub-done-${subtaskParentIdx}-${newIdx}`);
      checkbox?.focus();
    }, 0);
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center' }}>To‑Do List</h1>
      {/* Input form with accessible labels */}
      <form onSubmit={handleAddTask} style={{ marginBottom: '2rem' }}>
        <div style={{ marginBottom: '0.5rem' }}>
          <label htmlFor="title-input" style={{ display: 'block', marginBottom: '0.25rem' }}>
            Title
          </label>
          <input
            id="title-input"
            type="text"
            placeholder="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', fontSize: '1rem' }}
            required
          />
        </div>
        <div style={{ marginBottom: '0.5rem' }}>
          <label htmlFor="desc-input" style={{ display: 'block', marginBottom: '0.25rem' }}>
            Description (optional)
          </label>
          <textarea
            id="desc-input"
            placeholder="Task description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', resize: 'vertical' }}
            rows={3}
          />
        </div>
        <button type="submit" style={{ padding: '0.5rem 1rem', fontSize: '1rem' }}>
          Add Task
        </button>
      </form>

      {/* Task list */}
      {tasks.length === 0 ? (
        <p>No tasks yet. Add one above!</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {tasks.map((task, idx) => {
            const titleId = `task-title-${idx}`;
            const descId = `task-desc-${idx}`;
            const checkboxId = `task-done-${idx}`;
            return (
              <li
                key={idx}
                aria-labelledby={titleId}
                aria-describedby={task.description ? descId : undefined}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  padding: '0.75rem',
                  marginBottom: '0.75rem',
                  backgroundColor: '#f9f9f9',
                }}
              >
                {/* Checkbox to mark task as done */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id={checkboxId}
                    checked={task.done}
                    onChange={() => toggleDone(idx)}
                    aria-label="task done"
                  />
                  <label htmlFor={checkboxId} style={{ marginLeft: '0.5rem' }}>
                    Done
                  </label>
                </div>
                <strong id={titleId} style={{ textDecoration: task.done ? 'line-through' : 'none' }}>{task.title}</strong>
                {task.description && (
                  <p id={descId} style={{ margin: '0.25rem 0 0', textDecoration: task.done ? 'line-through' : 'none' }}>{task.description}</p>
                )}

                {/* Subtasks list */}
                {task.subtasks && task.subtasks.length > 0 && (
                  <ul style={{ listStyle: 'none', paddingLeft: '1rem', marginTop: '0.5rem' }}>
                    {task.subtasks.map((sub, sIdx) => {
                      const subTitleId = `sub-title-${idx}-${sIdx}`;
                      const subDescId = `sub-desc-${idx}-${sIdx}`;
                      const subCheckboxId = `sub-done-${idx}-${sIdx}`;
                      return (
                        <li key={sIdx} aria-labelledby={subTitleId} aria-describedby={sub.description ? subDescId : undefined} style={{ marginBottom: '0.4rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <input
                              type="checkbox"
                              id={subCheckboxId}
                              checked={sub.done}
                              onChange={() => toggleSubtaskDone(idx, sIdx)}
                              aria-label="subtask done"
                            />
                            <label htmlFor={subCheckboxId} style={{ marginLeft: '0.4rem' }}>
                              <strong id={subTitleId} style={{ textDecoration: sub.done ? 'line-through' : 'none' }}>{sub.title}</strong>
                            </label>
                          </div>
                          {sub.description && (
                            <p id={subDescId} style={{ margin: '0.2rem 0 0 1.6rem', textDecoration: sub.done ? 'line-through' : 'none' }}>{sub.description}</p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* Button to add a subtask */}
                <button type="button" onClick={() => setSubtaskParentIdx(idx)} style={{ marginTop: '0.5rem' }}>
                  Add Subtask
                </button>

                {/* Subtask entry form (shown only for the selected parent) */}
                {subtaskParentIdx === idx && (
                  <form onSubmit={handleAddSubtask} style={{ marginTop: '0.5rem' }}>
                    <div style={{ marginBottom: '0.25rem' }}>
                      <label htmlFor="subtask-title" style={{ display: 'block', marginBottom: '0.1rem' }}>Subtask Title</label>
                      <input
                        id="subtask-title"
                        type="text"
                        placeholder="Subtask title"
                        value={subtaskTitle}
                        onChange={(e) => setSubtaskTitle(e.target.value)}
                        required
                         style={{ width: '100%', padding: '0.4rem' }}
                      />
                    </div>
                    <div style={{ marginBottom: '0.25rem' }}>
                      <label htmlFor="subtask-desc" style={{ display: 'block', marginBottom: '0.1rem' }}>Subtask Description (optional)</label>
                      <textarea
                        id="subtask-desc"
                        placeholder="Subtask description"
                        value={subtaskDescription}
                        onChange={(e) => setSubtaskDescription(e.target.value)}
                        rows={2}
                        style={{ width: '100%', padding: '0.4rem', resize: 'vertical' }}
                      />
                    </div>
                    <button type="submit" style={{ padding: '0.3rem 0.6rem' }}>Add Subtask</button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default App;
