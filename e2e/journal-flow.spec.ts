import { expect, test } from '@playwright/test';
import { signInAsSmokeUser } from './helpers';

test('phone Today starts a reading block that resumes after visiting notes', async ({
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
  const plan = page.getByRole('region', { name: "Today's study plan" });
  await expect(plan).toBeVisible();
  await plan.getByRole('button', { name: '5 min', exact: true }).click();
  await plan
    .getByRole('button', { name: 'Start 5-minute reading block' })
    .click();
  await expect(
    page.getByRole('region', { name: 'Reading session' }),
  ).toBeVisible();
  const snapshot = (
    await (await page.request.get('/api/session/active')).json()
  ).data;
  expect(snapshot).toMatchObject({ mode: 'reading', readingLimitMs: 300000 });
  await page.getByRole('link', { name: 'Open my notes', exact: true }).click();
  await page.goto('/study');
  await expect(
    page.getByRole('region', { name: 'Reading session' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Finish reading' }).click();
  await expect(
    page.getByRole('heading', { name: 'Session saved' }),
  ).toBeVisible();
  await expect(page.getByText(/self-reported reading/)).toBeVisible();
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
