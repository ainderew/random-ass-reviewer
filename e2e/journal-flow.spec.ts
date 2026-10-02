import { expect, test } from '@playwright/test';
import { signInAsSmokeUser } from './helpers';

test('phone Focus keeps counting while she reads her notes elsewhere', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signInAsSmokeUser(context);
  const active = (await (await page.request.get('/api/session/active')).json())
    .data;
  if (active)
    await page.request.post('/api/session/end', {
      data: { sessionId: active.sessionId },
    });
  await page.goto('/study');
  await expect(page.getByRole('list', { name: "Today's plan" })).toBeVisible();
  await page.getByRole('link', { name: 'Focus', exact: true }).first().click();
  await expect(page.getByRole('button', { name: /^Read for/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Start focusing' }).click();
  await expect(page.getByRole('timer')).toBeVisible();

  // Off to the notes; the session keeps running and keeps counting.
  await page.goto('/notes');
  await page.waitForTimeout(2_000);
  const snapshot = (
    await (await page.request.get('/api/session/active')).json()
  ).data;
  expect(snapshot.focusedMs).toBeGreaterThanOrEqual(2_000);
  await page.goto('/focus');
  await page.getByRole('button', { name: 'End session' }).click();
  const skip = page.getByRole('button', { name: 'Skip, keep my Focus as is' });
  const saved = page.getByRole('heading', { name: 'Session saved' });
  await expect(skip.or(saved)).toBeVisible({ timeout: 15_000 });
  if (await skip.isVisible()) await skip.click();
  await expect(saved).toBeVisible({ timeout: 15_000 });
  expect(
    (await (await page.request.get('/api/session/active')).json()).data,
  ).toBeNull();
  await page.goto('/review/mistakes');
  await expect(
    page.getByRole('heading', { name: 'Give it another try.' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});
