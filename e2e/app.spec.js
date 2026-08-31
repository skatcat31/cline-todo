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
  await page.getByRole('button', { name: 'Dark theme' }).click();
  await page.reload();
  // The persisted choice selects the dark toggle (MUI sets aria‑pressed)
  await expect(
    page.getByRole('button', { name: 'Dark theme' }),
  ).toHaveAttribute('aria-pressed', 'true');
});

test('system color scheme follows the OS preference', async ({ page }) => {
  // Pin the OS color scheme to light, then flip it: with no stored
  // preference the app (default "system" scheme) must follow live.
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await expect(page.locator('html')).not.toHaveClass(/dark/);

  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveClass(/dark/);
});

test('shows the due date of a task', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Title').fill('Plan trip');
  await page.getByLabel('Due date (optional)').fill('2999-05-01');
  await page.getByRole('button', { name: 'Add Task' }).click();
  await expect(page.getByRole('listitem', { name: 'Plan trip' })).toBeVisible();
  await expect(page.getByText('Due May 1, 2999')).toBeVisible();
});

test('undoes several deletions in reverse order', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Title').fill('First task');
  await page.getByRole('button', { name: 'Add Task' }).click();
  await page.getByLabel('Title').fill('Second task');
  await page.getByRole('button', { name: 'Add Task' }).click();

  await page
    .getByRole('listitem', { name: 'First task' })
    .getByRole('button', { name: 'Delete task' })
    .click();
  await page
    .getByRole('listitem', { name: 'Second task' })
    .getByRole('button', { name: 'Delete task' })
    .click();
  // The snackbar offers the latest delete
  await expect(page.getByText('Deleted "Second task"')).toBeVisible();

  // Undo once: the most recent delete comes back…
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(
    page.getByRole('listitem', { name: 'Second task' }),
  ).toBeVisible();
  await expect(page.getByRole('listitem', { name: 'First task' })).toHaveCount(
    0,
  );
  // …and again: the earlier delete
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(
    page.getByRole('listitem', { name: 'First task' }),
  ).toBeVisible();
});
