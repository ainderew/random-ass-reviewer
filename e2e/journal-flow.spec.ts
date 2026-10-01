import { expect, test } from '@playwright/test';
import { signInAsSmokeUser } from './helpers';

test('phone Focus starts a reading block that resumes after visiting notes', async ({
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
  await page.getByRole('button', { name: 'Read for 5 minutes' }).click();
  await expect(
    page.getByRole('region', { name: 'Reading session' }),
  ).toBeVisible();
  const snapshot = (
    await (await page.request.get('/api/session/active')).json()
  ).data;
  expect(snapshot).toMatchObject({ mode: 'reading', readingLimitMs: 300000 });
  await page.getByRole('link', { name: 'Open my notes', exact: true }).click();
  await page.goto('/focus');
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
