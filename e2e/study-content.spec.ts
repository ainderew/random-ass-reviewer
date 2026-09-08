import { expect, test } from '@playwright/test';
import { signInAsSmokeUser } from './helpers';

const NOTES = (salt: string) => `# Cell membranes ${salt}

The plasma membrane is a phospholipid bilayer. Phospholipid heads are hydrophilic and face the water on both sides. The fatty acid tails are hydrophobic and point inward. Cholesterol keeps the membrane fluid at low temperatures and stable at high temperatures. Simple diffusion moves small nonpolar molecules such as oxygen straight through the bilayer.`;

// Notes in, verified cards out, recall paid. Works against any provider; the
// wait covers a real model, and the fake provider answers in milliseconds.
test('notes become cards with quotes, and reviewing them pays Insight', async ({
  page,
  context,
}) => {
  test.setTimeout(240_000);
  await signInAsSmokeUser(context);

  const created = await page.request.post('/api/notes', {
    data: {
      kind: 'paste',
      text: NOTES(String(Date.now())),
      title: 'E2E membranes',
    },
  });
  expect(created.status()).toBe(201);
  const { sourceId } = (await created.json()).data;

  await expect
    .poll(
      async () =>
        (await (await page.request.get(`/api/notes/${sourceId}/status`)).json())
          .data.finished,
      { timeout: 180_000, intervals: [2000] },
    )
    .toBe(true);
  const detail = (
    await (await page.request.get(`/api/notes/${sourceId}`)).json()
  ).data;
  expect(detail.cards.length).toBeGreaterThan(0);

  await page.goto(`/notes/${sourceId}`);
  const quotes = page.locator('blockquote');
  await expect(quotes.first()).toBeVisible();
  expect(await quotes.count()).toBe(detail.cards.length);

  const before = (await (await page.request.get('/api/stats')).json()).data
    .stats.insightBalance;
  await page.goto('/review');
  const reveal = page.getByRole('button', { name: /Show answer/ });
  await expect(reveal).toBeVisible();
  let answered = 0;
  for (let i = 0; i < 5; i += 1) {
    if (!(await reveal.isVisible().catch(() => false))) break;
    await page.keyboard.press('Space');
    await expect(
      page.getByRole('group', { name: 'Rate your recall' }),
    ).toBeVisible();
    await page.keyboard.press('3');
    answered += 1;
    await page.waitForTimeout(400);
  }
  expect(answered).toBeGreaterThan(0);
  await expect
    .poll(
      async () =>
        (await (await page.request.get('/api/stats')).json()).data.stats
          .insightBalance,
    )
    .toBeGreaterThan(before);

  const removed = await page.request.delete(`/api/notes/${sourceId}`);
  expect(removed.ok()).toBe(true);
});
