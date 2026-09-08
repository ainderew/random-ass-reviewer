import { expect, test } from '@playwright/test';
import { signInAsSmokeUser } from './helpers';

// Study, earn, build, and the building is still there after a reload. The
// placement goes through the API because canvas raycasting in a headless
// browser is not a thing worth testing; persistence is.
test('study to earn, build, and keep it', async ({ page, context }) => {
  await signInAsSmokeUser(context);
  const active = await (await page.request.get('/api/session/active')).json();
  if (active.data)
    await page.request.post('/api/session/end', {
      data: { sessionId: active.data.sessionId },
    });

  await page.goto('/study');
  await page.getByRole('button', { name: 'Start focusing' }).click();
  await expect(page.getByRole('timer')).toBeVisible();
  // One heartbeat interval, so the server has something to count.
  await page.waitForTimeout(16_000);
  await page.getByRole('button', { name: 'End session' }).click();
  const skip = page.getByRole('button', { name: 'Skip, keep my Focus as is' });
  const saved = page.getByRole('heading', { name: 'Session saved' });
  await expect(skip.or(saved)).toBeVisible({ timeout: 15_000 });
  if (await skip.isVisible()) await skip.click();
  await expect(saved).toBeVisible({ timeout: 15_000 });

  const island = (await (await page.request.get('/api/island')).json()).data;
  const taken = new Set(
    island.placements.map((p: { x: number; z: number }) => `${p.x},${p.z}`),
  );
  let tile = { x: 0, z: 0 };
  outer: for (let x = 0; x < island.island.tileCount; x += 1) {
    for (let z = 0; z < island.island.tileCount; z += 1) {
      if (!taken.has(`${x},${z}`)) {
        tile = { x, z };
        break outer;
      }
    }
  }
  const placed = await page.request.post('/api/island/place', {
    data: { assetId: 'grass_tuft', ...tile, rotY: 0 },
  });
  expect(placed.status()).toBe(201);
  const placementId = (await placed.json()).data.placement.id;

  await page.goto('/island');
  await page.evaluate(() => localStorage.setItem('aloft:island-list', 'on'));
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Your island' }),
  ).toBeVisible();
  await expect(page.getByText('Grass tuft')).toBeVisible();

  const removed = await page.request.delete(`/api/island/place/${placementId}`);
  expect(removed.ok()).toBe(true);
  await page.evaluate(() => localStorage.removeItem('aloft:island-list'));
});
