import { expect, test } from '@playwright/test';
import { signInAsSmokeUser } from './helpers';

// Real focus and key handling; jsdom's model is not trustworthy for this.
test.describe('review by keyboard only', () => {
  test.beforeEach(async ({ context }) => signInAsSmokeUser(context));

  test('Space reveals, a digit rates and advances, the mouse untouched', async ({
    page,
  }) => {
    await page.goto('/review');
    await page.waitForLoadState('networkidle');
    const region = page.getByRole('region', { name: 'Review', exact: true });
    const caughtUp = page.getByText(/caught up|No cards yet/);
    await expect(region.or(caughtUp)).toBeVisible();
    test.skip(
      await caughtUp.isVisible(),
      'nothing due for the smoke user right now',
    );

    const counter = region.locator('p.font-mono').first();
    const before = await counter.textContent();
    await expect(
      page.getByRole('group', { name: 'Rate your recall' }),
    ).toHaveCount(0);

    // Hydration attaches the key handler; the reveal button is the signal it is live.
    await page.getByRole('button', { name: /Show answer/ }).waitFor();
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('Space');
    const ratings = page.getByRole('group', { name: 'Rate your recall' });
    await expect(ratings).toBeVisible();
    await expect(
      ratings.getByRole('button', { name: /^Good, next in/ }),
    ).toBeVisible();

    await page.keyboard.press('3');
    await expect(counter).not.toHaveText(before ?? '');
  });

  test('tab order reaches the reveal button and the ratings', async ({
    page,
  }) => {
    await page.goto('/review');
    const reveal = page.getByRole('button', { name: /Show answer/ });
    test.skip(!(await reveal.isVisible().catch(() => false)), 'nothing due');
    await page.keyboard.press('Tab');
    let hops = 0;
    while (
      !(await reveal.evaluate((el) => el === document.activeElement)) &&
      hops < 20
    ) {
      await page.keyboard.press('Tab');
      hops += 1;
    }
    expect(hops).toBeLessThan(20);
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('group', { name: 'Rate your recall' }),
    ).toBeVisible();
  });
});
