// Core user-flow tests for the to-do app.
import { expect, test } from '@playwright/test';

test('adds a task and keeps it after a reload', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Title').fill('E2E task');
  await page.getByRole('button', { name: 'Add Task' }).click();
  await expect(page.getByRole('listitem', { name: 'E2E task' })).toBeVisible();

  // Persistence is backed by localStorage, so the task must survive a reload
  await page.reload();
  await expect(page.getByRole('listitem', { name: 'E2E task' })).toBeVisible();
});

test('clears completed tasks and can undo', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Title').fill('Done task');
  await page.getByRole('button', { name: 'Add Task' }).click();

  await page.getByRole('checkbox', { name: 'Done task' }).check();
  await page.getByRole('button', { name: 'Clear completed' }).click();
  await expect(page.getByRole('listitem', { name: 'Done task' })).toHaveCount(
    0,
  );
  // A single removed task is named in the snackbar message
  await expect(page.getByText('Deleted "Done task"')).toBeVisible();

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('listitem', { name: 'Done task' })).toBeVisible();
});

test('remembers the color scheme after a reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await page.reload();
  // The persisted "dark" choice flips the toggle's label
  await expect(
    page.getByRole('button', { name: 'Switch to light mode' }),
  ).toBeVisible();
});
