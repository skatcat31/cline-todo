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

test('reminds about tasks that are due today', async ({ context }) => {
  // Replace the Notification API with a recording stand‑in (permission
  // pre‑granted) so the reminder flow is deterministic in headless mode.
  await context.addInitScript(() => {
    window.__notifications = [];
    window.Notification = class {
      static get permission() {
        return 'granted';
      }
      static requestPermission() {
        return Promise.resolve('granted');
      }
      constructor(title, options) {
        window.__notifications.push({ title, body: options?.body });
      }
    };
  });
  const page = await context.newPage();
  await page.goto('/');

  // Add a task due today (local calendar date).
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(now.getDate()).padStart(2, '0')}`;
  await page.getByLabel('Title').fill('Water the plants');
  await page.getByLabel('Due date (optional)').fill(today);
  await page.getByRole('button', { name: 'Add Task' }).click();

  // Granted + enabled: the app‑bar button offers to turn the reminders off.
  await expect(
    page.getByRole('button', { name: 'Turn off due‑date reminders' }),
  ).toBeVisible();

  // …and a reminder was announced for the task due today.
  await expect
    .poll(async () => page.evaluate(() => window.__notifications.length))
    .toBe(1);
  expect(await page.evaluate(() => window.__notifications[0])).toEqual({
    title: 'Task due today',
    body: 'Water the plants',
  });
});

test('sorts the list by due date and remembers the choice', async ({
  page,
}) => {
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

test('manages multiple task lists', async ({ page }) => {
  await page.goto('/');
  // A task in the default list…
  await page.getByLabel('Title').fill('Personal task');
  await page.getByRole('button', { name: 'Add Task' }).click();

  // …then create and switch to a second list.
  await page.getByRole('button', { name: 'New list' }).click();
  await page.getByLabel('List name').fill('Work');
  await page.getByRole('button', { name: 'Create list' }).click();
  await expect(page.getByRole('tab', { name: 'Work' })).toHaveAttribute(
    'aria-selected',
    'true',
  );

  await page.getByLabel('Title').fill('Work task');
  await page.getByRole('button', { name: 'Add Task' }).click();
  await expect(page.getByRole('listitem', { name: 'Work task' })).toBeVisible();
  // The default list's task is not shown in the new list.
  await expect(
    page.getByRole('listitem', { name: 'Personal task' }),
  ).toHaveCount(0);

  // Switching back shows the original task…
  await page.getByRole('tab', { name: 'To-Do' }).click();
  await expect(
    page.getByRole('listitem', { name: 'Personal task' }),
  ).toBeVisible();

  // …and both lists (plus the active one) survive a reload.
  await page.reload();
  await expect(page.getByRole('tab', { name: 'To-Do' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('tab', { name: 'Work' }).click();
  await expect(page.getByRole('listitem', { name: 'Work task' })).toBeVisible();
});

test('renames and deletes a list', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New list' }).click();
  await page.getByLabel('List name').fill('Work');
  await page.getByRole('button', { name: 'Create list' }).click();
  await expect(page.getByRole('tab', { name: 'Work' })).toBeVisible();

  // Rename via the list options menu (the input is pre‑filled).
  await page.getByRole('button', { name: 'List options' }).click();
  await page.getByRole('menuitem', { name: 'Rename list' }).click();
  await page.getByLabel('List name').fill('Side projects');
  await page.getByRole('button', { name: 'Rename list' }).click();
  await expect(page.getByRole('tab', { name: 'Side projects' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Work' })).toHaveCount(0);

  // Delete the renamed list again: confirm in the dialog.
  await page.getByRole('button', { name: 'List options' }).click();
  await page.getByRole('menuitem', { name: 'Delete list' }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Delete list' })
    .click();
  await expect(page.getByRole('tab', { name: 'Side projects' })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'To-Do' })).toHaveAttribute(
    'aria-selected',
    'true',
  );

  // With only one list left, "Delete list" is disabled (MUI marks it with
  // the Mui-disabled class and removes it from the tab order).
  await page.getByRole('button', { name: 'List options' }).click();
  await expect(page.getByRole('menuitem', { name: 'Delete list' })).toHaveClass(
    /Mui-disabled/,
  );
});
