// PWA behavior: service worker registration, the web app manifest, and
// offline usage of the precached app shell.
import { expect, test } from '@playwright/test';

/**
 * Resolves once the service worker is registered, activated and
 * controlling the page (polled from the test process with
 * page.evaluate).
 */
async function waitForControllingServiceWorker(page) {
  await expect
    .poll(
      async () =>
        page.evaluate(() =>
          navigator.serviceWorker
            .getRegistration()
            .then((reg) =>
              Boolean(reg && reg.active && navigator.serviceWorker.controller),
            ),
        ),
      { timeout: 30_000 },
    )
    .toBe(true);
}

test('registers the service worker and serves an installable manifest', async ({
  page,
}) => {
  await page.goto('/');
  await waitForControllingServiceWorker(page);

  const manifest = await page.evaluate(async () => {
    const link = document.querySelector('link[rel="manifest"]');
    const response = await fetch(link.href);
    return response.json();
  });
  expect(manifest.name).toContain('Do List');
  expect(
    manifest.icons.some(
      (icon) => icon.sizes === '512x512' && icon.purpose === 'maskable',
    ),
  ).toBe(true);
});

test('stays usable offline', async ({ page, context }) => {
  await page.goto('/');
  await page.getByLabel('Title').fill('Offline task');
  await page.getByRole('button', { name: 'Add Task' }).click();

  // Wait until the service worker is activated and controlling, so the
  // precache is in place
  await waitForControllingServiceWorker(page);

  await context.setOffline(true);
  await page.reload({ waitUntil: 'load' });
  // The app shell comes from the precache and the task from localStorage
  await expect(page.getByRole('heading', { name: 'To‑Do List' })).toBeVisible();
  await expect(
    page.getByRole('listitem', { name: 'Offline task' }),
  ).toBeVisible();
});
