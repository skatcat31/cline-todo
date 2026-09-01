import { useState } from 'react';
import Add from '@mui/icons-material/Add';
import MoreVert from '@mui/icons-material/MoreVert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

/**
 * The list tabs and the list management: one tab per list (the active one
 * is selected), a "New list" button and a "List options" menu with
 * "Rename list" and "Delete list" (deleting the last remaining list is
 * disabled). Rename and delete go through small dialogs.
 * Props:
 *   lists - [{ id, name, tasks }]
 *   activeListId - the id of the list currently shown
 *   onSelect - switch the active list (called with the list id)
 *   onAdd - create a new list with the given name
 *   onRename - rename a list (called with (id, name))
 *   onDelete - delete a list and its tasks (called with the id)
 */
export default function ListTabs({
  lists,
  activeListId,
  onSelect,
  onAdd,
  onRename,
  onDelete,
}) {
  const [newListOpen, setNewListOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [newName, setNewName] = useState('');
  const [renameName, setRenameName] = useState('');
  // The list the options menu acts on (the active one).
  const activeList = lists.find((list) => list.id === activeListId) ?? lists[0];

  // Create the new list from the dialog form.
  const handleAddSubmit = (event) => {
    event.preventDefault();
    if (!newName.trim()) return;
    onAdd(newName);
    setNewName('');
    setNewListOpen(false);
  };

  // Rename the active list from the dialog form.
  const handleRenameSubmit = (event) => {
    event.preventDefault();
    if (!renameName.trim()) return;
    onRename(activeList.id, renameName);
    setRenameOpen(false);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Tabs
        value={activeList ? activeList.id : false}
        onChange={(_, id) => onSelect(id)}
        aria-label="Task lists"
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{
          flexGrow: 1,
          minHeight: 0,
          '& .MuiTab-root': {
            textTransform: 'none',
            minHeight: 0,
            py: 0.5,
            fontWeight: 600,
          },
        }}
      >
        {lists.map((list) => (
          <Tab key={list.id} value={list.id} label={list.name} />
        ))}
      </Tabs>
      <IconButton
        size="small"
        aria-label="New list"
        title="Create a new list"
        onClick={() => setNewListOpen(true)}
      >
        <Add fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        aria-label="List options"
        title="Rename or delete the current list"
        onClick={(event) => setMenuAnchor(event.currentTarget)}
      >
        <MoreVert fontSize="small" />
      </IconButton>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            setRenameName(activeList.name);
            setRenameOpen(true);
          }}
        >
          Rename list
        </MenuItem>
        <MenuItem
          disabled={lists.length <= 1}
          onClick={() => {
            setMenuAnchor(null);
            setDeleteOpen(true);
          }}
        >
          Delete list
        </MenuItem>
      </Menu>

      {/* New list: a small dialog with a name field. */}
      <Dialog open={newListOpen} onClose={() => setNewListOpen(false)}>
        <form onSubmit={handleAddSubmit}>
          <DialogTitle>New list</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              label="List name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              inputProps={{ maxLength: 40 }}
              sx={{ minWidth: 240 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setNewListOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!newName.trim()}
            >
              Create list
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Rename: pre-filled with the active list's current name. */}
      <Dialog open={renameOpen} onClose={() => setRenameOpen(false)}>
        <form onSubmit={handleRenameSubmit}>
          <DialogTitle>Rename list</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              label="List name"
              value={renameName}
              onChange={(event) => setRenameName(event.target.value)}
              inputProps={{ maxLength: 40 }}
              sx={{ minWidth: 240 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!renameName.trim()}
            >
              Rename list
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete: confirms, because the list's tasks are gone for good. */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Delete list</DialogTitle>
        <DialogContent>
          <Typography component="p">
            Delete the list “{activeList.name}” and its{' '}
            {activeList.tasks.length}{' '}
            {activeList.tasks.length === 1 ? 'task' : 'tasks'}? This cannot be
            undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              onDelete(activeList.id);
              setDeleteOpen(false);
            }}
          >
            Delete list
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
