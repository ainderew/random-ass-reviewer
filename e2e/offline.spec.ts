import { expect, test } from '@playwright/test';
import { signInAsSmokeUser } from './helpers';

test('going offline shows the banner and keeps the timer on screen', async ({
  page,
  context,
}) => {
  await signInAsSmokeUser(context);
  await page.goto('/study');
  await page.waitForLoadState('networkidle');
  const start = page.getByRole('button', { name: 'Start focusing' });
  const end = page.getByRole('button', { name: 'End session' });
  await expect(start.or(end)).toBeVisible();
  if (await start.isVisible()) {
    await start.click();
    await expect(end).toBeVisible({ timeout: 10_000 });
  }

  await context.setOffline(true);
  await expect(page.getByText('You are offline')).toBeVisible();
  await expect(page.getByRole('timer')).toBeVisible();
  await expect(end).toBeVisible();

  await context.setOffline(false);
  await expect(page.getByText('You are offline')).toHaveCount(0);
  await expect(end).toBeVisible();
});
