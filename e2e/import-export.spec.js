// Export / import of the task list as JSON: the download itself, the
// replace/merge decision for non-empty lists, and the invalid-file error.
import { expect, test } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// A writable, per-run place for the fixture files (the import flow needs a
// real file on disk; the OS temp dir keeps the repository untouched).
const fixtures = join(tmpdir(), 'agentic-todo-e2e');
mkdirSync(fixtures, { recursive: true });

// One canonical task (the shape the app exports and normalizes on import –
// see src/utils/taskNormalize.js).
const task = (id, title, due = null) => ({
  id,
  title,
  description: '',
  due,
  done: false,
  subtasks: [],
});

// Write a JSON file holding the given tasks (the export file format) and
// return its path.
const tasksFile = (name, tasks) => {
  const path = join(fixtures, name);
  writeFileSync(path, JSON.stringify(tasks, null, 2));
  return path;
};

test('hides the export action while the list is empty', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Export tasks' })).toHaveCount(
    0,
  );
});

test('exports the active list as a JSON file', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Title').fill('Exported task');
  await page.getByLabel('Due date (optional)').fill('2999-05-01');
  await page.getByRole('button', { name: 'Add Task' }).click();
  await expect(
    page.getByRole('listitem', { name: 'Exported task' }),
  ).toBeVisible();

  // The export button downloads the list as JSON.
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export tasks' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('todo-tasks.json');

  const tasks = JSON.parse(await readFileSync(await download.path(), 'utf8'));
  expect(tasks).toEqual([
    expect.objectContaining({
      id: expect.any(String),
      title: 'Exported task',
      due: '2999-05-01',
      done: false,
      subtasks: [],
    }),
  ]);
});

test('imports tasks into an empty list without confirming', async ({
  page,
}) => {
  await page.goto('/');
  await page.setInputFiles(
    'input[type="file"]',
    tasksFile('import-empty.json', [task('i1', 'Imported task')]),
  );
  await expect(
    page.getByRole('listitem', { name: 'Imported task' }),
  ).toBeVisible();
  // The import went through the normal mutation path, so the tasks are
  // persisted like any others.
  await page.reload();
  await expect(
    page.getByRole('listitem', { name: 'Imported task' }),
  ).toBeVisible();
});

test('asks to replace or merge when the list is not empty', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Title').fill('Kept task');
  await page.getByRole('button', { name: 'Add Task' }).click();
  await expect(page.getByRole('listitem', { name: 'Kept task' })).toBeVisible();

  await page.setInputFiles(
    'input[type="file"]',
    tasksFile('import-merge.json', [
      task('i1', 'Imported task'),
      task('i2', 'Second import'),
    ]),
  );
  // The confirmation dialog names how many tasks the file contains.
  await expect(page.getByRole('dialog')).toContainText('2 tasks');
  // Merging keeps the current tasks and adds the imported ones.
  await page.getByRole('button', { name: 'Merge into list' }).click();
  await expect(page.getByRole('listitem', { name: 'Kept task' })).toBeVisible();
  await expect(
    page.getByRole('listitem', { name: 'Imported task' }),
  ).toBeVisible();
  await expect(
    page.getByRole('listitem', { name: 'Second import' }),
  ).toBeVisible();
  // …and the merged list is what gets persisted.
  await page.reload();
  await expect(page.getByRole('listitem', { name: 'Kept task' })).toBeVisible();
  await expect(
    page.getByRole('listitem', { name: 'Imported task' }),
  ).toBeVisible();
});

test('replaces the list when "Replace list" is chosen', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Title').fill('Kept task');
  await page.getByRole('button', { name: 'Add Task' }).click();
  await expect(page.getByRole('listitem', { name: 'Kept task' })).toBeVisible();

  await page.setInputFiles(
    'input[type="file"]',
    tasksFile('import-replace.json', [task('i1', 'Imported task')]),
  );
  await page.getByRole('button', { name: 'Replace list' }).click();
  await expect(page.getByRole('listitem', { name: 'Kept task' })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole('listitem', { name: 'Imported task' }),
  ).toBeVisible();
});

test('rejects an invalid import file', async ({ page }) => {
  await page.goto('/');
  const path = join(fixtures, 'invalid.json');
  writeFileSync(path, 'this is not a task list');
  await page.setInputFiles('input[type="file"]', path);
  // The error prompt is shown and the (empty) list stays untouched.
  await expect(page.getByText('Import failed')).toBeVisible();
  await expect(page.getByRole('listitem')).toHaveCount(0);
});

test('rejects valid JSON that is not a task list', async ({ page }) => {
  // An object (even a plausible-looking one) must not wipe the current
  // list – only a task *array* is accepted.
  await page.goto('/');
  await page.getByLabel('Title').fill('Existing task');
  await page.getByRole('button', { name: 'Add Task' }).click();
  await expect(
    page.getByRole('listitem', { name: 'Existing task' }),
  ).toBeVisible();

  const path = join(fixtures, 'object.json');
  writeFileSync(path, JSON.stringify({ tasks: [task('i1', 'Imported task')] }));
  await page.setInputFiles('input[type="file"]', path);
  await expect(page.getByText('Import failed')).toBeVisible();
  await expect(
    page.getByRole('listitem', { name: 'Existing task' }),
  ).toBeVisible();
  await expect(
    page.getByRole('listitem', { name: 'Imported task' }),
  ).toHaveCount(0);
});
