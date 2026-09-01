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

test('sorts the list by due date and remembers the choice', async ({ page }) => {
  await page.goto('/');
  const titleInput = page.getByLabel('Title');
  const dueInput = page.getByLabel('Due date (optional)');
  const addBtn = page.getByRole('button', { name: 'Add Task' });

  await titleInput.fill('Later task');
  await dueInput.fill('2999-02-01');
  await addBtn.click();
  await titleInput.fill('Earlier task');
  await dueInput.fill('2999-01-01');
  await addBtn.click();

  // The manual list order by default
  const rows = page.getByRole('listitem');
  expect(await rows.nth(0).textContent()).toContain('Later task');
  expect(await rows.nth(1).textContent()).toContain('Earlier task');

  // The due‑date sort puts the earliest due date first
  await page.getByRole('button', { name: 'Sort by due date' }).click();
  expect(await rows.nth(0).textContent()).toContain('Earlier task');
  expect(await rows.nth(1).textContent()).toContain('Later task');

  // The choice is remembered across a reload
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Sort by due date' }),
  ).toHaveAttribute('aria-pressed', 'true');
  expect(await rows.nth(0).textContent()).toContain('Earlier task');
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

test('auto-hide offers the previous undo instead of discarding the stack', async ({
  page,
}) => {
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
  await expect(page.getByText('Deleted "Second task"')).toBeVisible();

  // Both delete buttons sit where the snackbar opens, so the pointer is
  // left right over the alert. MUI pauses the auto‑hide timer while the
  // snackbar is hovered, so move the pointer away like a user would.
  await page.mouse.move(10, 10);

  // Wait out the auto‑hide: the snackbar re‑opens for the previous
  // undo (with a fresh timer) instead of disappearing entirely.
  await page.waitForTimeout(6500);
  await expect(page.getByText('Deleted "First task"')).toBeVisible();

  // Undo restores the remaining deletion; the expired one stays gone.
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(
    page.getByRole('listitem', { name: 'First task' }),
  ).toBeVisible();
  await expect(page.getByRole('listitem', { name: 'Second task' })).toHaveCount(
    0,
  );
});

test('reorders tasks by dragging them onto another row', async ({ page }) => {
  // A taller viewport so all three rows fit on screen: a drop whose
  // coordinates fall outside the viewport never reaches the list.
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto('/');
  const titleInput = page.getByLabel('Title');
  const addBtn = page.getByRole('button', { name: 'Add Task' });
  for (const name of ['First', 'Second', 'Third']) {
    await titleInput.fill(name);
    await addBtn.click();
  }

  // Drag "First" onto the lower half of "Third"'s row: a drop there
  // inserts the task *after* that row, so it becomes the last one.
  const third = page.getByRole('listitem', { name: 'Third' });
  const box = await third.boundingBox();
  await page
    .getByRole('listitem', { name: 'First' })
    .getByRole('button', { name: 'Reorder task' })
    .dragTo(third, {
      targetPosition: { x: box.width / 2, y: box.height * 0.8 },
    });

  const rows = page.getByRole('listitem');
  expect(await rows.nth(0).textContent()).toContain('Second');
  expect(await rows.nth(1).textContent()).toContain('Third');
  expect(await rows.nth(2).textContent()).toContain('First');

  // The new order is what gets persisted.
  await page.reload();
  expect(await rows.nth(0).textContent()).toContain('Second');
  expect(await rows.nth(1).textContent()).toContain('Third');
  expect(await rows.nth(2).textContent()).toContain('First');
});
