import { expect, test, type Page } from '@playwright/test';
import { signInAsSmokeUser } from './helpers';

// The three probes, through the real HTTP stack. Every payout is computed
// on the server from timestamps the server stamped.
async function endAnyActive(page: Page): Promise<void> {
  const active = await (await page.request.get('/api/session/active')).json();
  if (active.data)
    await page.request.post('/api/session/end', {
      data: { sessionId: active.data.sessionId },
    });
}

test.describe('anti-cheat probes', () => {
  test.beforeEach(async ({ context }) => signInAsSmokeUser(context));

  test('a session ended with no heartbeats pays nothing', async ({ page }) => {
    await endAnyActive(page);
    const started = await (
      await page.request.post('/api/session/start')
    ).json();
    const ended = await (
      await page.request.post('/api/session/end', {
        data: { sessionId: started.data.sessionId },
      })
    ).json();
    expect(ended.data.focusAwarded).toBe(0);
    expect(ended.data.creditedMs).toBe(0);
  });

  test('a replayed heartbeat seq and inflated fields change nothing', async ({
    page,
  }) => {
    await endAnyActive(page);
    const { sessionId } = (
      await (await page.request.post('/api/session/start')).json()
    ).data;
    const first = await (
      await page.request.post('/api/session/beat', {
        data: { sessionId, seq: 0, focused: true },
      })
    ).json();
    const replay = await (
      await page.request.post('/api/session/beat', {
        data: { sessionId, seq: 0, focused: true },
      })
    ).json();
    expect(replay.data.focusedMs).toBe(first.data.focusedMs);

    const inflated = await (
      await page.request.post('/api/session/beat', {
        data: {
          sessionId,
          seq: 1,
          focused: true,
          elapsedMs: 3_600_000,
          focusedMs: 3_600_000,
          at: '2020-01-01T00:00:00Z',
        },
      })
    ).json();
    // Two beats a second apart credit under one interval, whatever the body claims.
    expect(inflated.data.focusedMs).toBeLessThan(60_000);

    const ended = await (
      await page.request.post('/api/session/end', {
        data: { sessionId, creditedMs: 9_999_999 },
      })
    ).json();
    expect(ended.data.focusAwarded).toBe(0);
  });

  test('the balance shown is the server balance, whatever the page does', async ({
    page,
  }) => {
    const before = (await (await page.request.get('/api/stats')).json()).data
      .stats.focusBalance;
    await page.goto('/study');
    await page.evaluate(() => {
      localStorage.setItem('aloft:focus', '999999');
      for (const el of document.querySelectorAll('header span')) {
        if (/^\d[\d,]*$/.test(el.textContent ?? '')) el.textContent = '999,999';
      }
    });
    await page.reload();
    const after = (await (await page.request.get('/api/stats')).json()).data
      .stats.focusBalance;
    expect(after).toBe(before);
    await expect(page.locator('header')).toContainText(before.toLocaleString());
  });
});
