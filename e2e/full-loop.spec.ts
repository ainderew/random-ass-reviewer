import { expect, test } from '@playwright/test';
import { signInAsSmokeUser } from './helpers';

test('focus sessions save and retired island links return to Today', async ({
  page,
  context,
}) => {
  await signInAsSmokeUser(context);
  const active = await (await page.request.get('/api/session/active')).json();
  if (active.data)
    await page.request.post('/api/session/end', {
      data: { sessionId: active.data.sessionId },
    });

  await page.goto('/focus');
  await page.getByRole('button', { name: 'Start focusing' }).click();
  await expect(page.getByRole('timer')).toBeVisible();
  // Some real time, so the server's clock has something to count.
  await page.waitForTimeout(16_000);
  await page.getByRole('button', { name: 'End session' }).click();
  const skip = page.getByRole('button', { name: 'Skip quiz' });
  const saved = page.getByRole('heading', { name: 'Session saved' });
  await expect(skip.or(saved)).toBeVisible({ timeout: 15_000 });
  if (await skip.isVisible()) await skip.click();
  await expect(saved).toBeVisible({ timeout: 15_000 });

  await page.reload();
  expect(
    (await (await page.request.get('/api/session/active')).json()).data,
  ).toBeNull();
  await page.goto('/island');
  await expect(page).toHaveURL(/\/study$/);
  await expect(
    page.getByRole('link', { name: 'Island', exact: true }),
  ).toHaveCount(0);
  expect((await page.request.get('/api/island')).status()).toBe(404);
});
