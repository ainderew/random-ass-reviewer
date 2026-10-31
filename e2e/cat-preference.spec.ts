import { expect, test } from '@playwright/test';
import { signInAsSmokeUser } from './helpers';

test('illustrated cat is the default and selection survives navigation and reloads', async ({
  page,
  context,
}) => {
  await signInAsSmokeUser(context);
  await page.goto('/study');
  const cat = page.getByRole('button', { name: 'Pet the study cat' });
  await expect(cat).toBeVisible();
  await page.getByRole('link', { name: 'Focus', exact: true }).first().click();
  await expect(page).toHaveURL(/\/focus$/);
  await expect(cat).toBeVisible();
  await page.reload();
  await expect(cat).toBeVisible();
  await page.goto('/focus?cat=3d');
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('aloft-cat-view')))
    .toBe('3d');
  await page.getByRole('link', { name: 'Today', exact: true }).first().click();
  await expect(page).toHaveURL(/\/study$/);
  await expect(cat).toHaveCount(0);
});

test('Focus defaults to the illustrated cat in a fresh browser', async ({
  page,
  context,
}) => {
  await signInAsSmokeUser(context);
  await page.goto('/focus');
  await expect(
    page.getByRole('button', { name: 'Pet the study cat' }),
  ).toBeVisible();
});
