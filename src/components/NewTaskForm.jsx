import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

/**
 * The "New Task" entry form, presented as a Material card. Owns the
 * draft field state (title, description, optional due date); a
 * successful submit reports `{title, description, due}` to the parent
 * and clears the fields (`due` is `null` when left empty).
 * Props:
 *   onAddTask - called with {title, description, due} on submit
 *   titleFieldRef - optional ref object that receives the title input
 *                   element (so the app can restore focus to it, e.g.
 *                   when the list becomes empty after a delete)
 */
export default function NewTaskForm({ onAddTask, titleFieldRef }) {
  // Controlled input state for the new task
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [due, setDue] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddTask({ title, description, due: due || null });
    setTitle('');
    setDescription('');
    setDue('');
  };

  return (
    <Card elevation={2} sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" component="h2" gutterBottom>
          New Task
        </Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            id="title"
            label="Title"
            placeholder="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            fullWidth
            margin="normal"
            inputRef={titleFieldRef}
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
          <TextField
            id="due-date"
            label="Due date (optional)"
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            fullWidth
            margin="normal"
          />
          <Button type="submit" variant="contained" sx={{ mt: 1 }}>
            Add Task
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
