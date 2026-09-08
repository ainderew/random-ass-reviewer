import { eq } from 'drizzle-orm';
import { ASSET_MANIFEST } from '@/domain/assets/manifest.generated';
import { closeDb, db } from '@/server/db';
import { placements, userStats, users } from '@/server/db/schema';
import { incrementBalances } from '@/server/repositories/user-stats';
import { getIslandView, placeAsset, removePlacement } from './island';
import { createUserWithDefaults } from './user-bootstrap';

// The unique index on (island_id, x, z) is the correctness mechanism, so this
// runs against the real database.

const LANTERN = ASSET_MANIFEST.lantern_brass;
const COTTAGE = ASSET_MANIFEST.cottage_scholar;

async function balance(userId: string): Promise<number> {
  const row = await db.query.userStats.findFirst({
    where: eq(userStats.userId, userId),
  });
  return row!.focusBalance;
}

describe('island service', () => {
  let userId = '';
  let islandId = '';

  beforeAll(async () => {
    const user = await createUserWithDefaults({
      id: 'ignored',
      email: `island-${Date.now()}@test.local`,
      emailVerified: null,
    });
    userId = user.id;
    islandId = (await getIslandView(userId)).island.id;
  });

  it('reports world signals from real study history', async () => {
    const view = await getIslandView(userId);
    expect(view.timeZone).toBe('UTC');
    expect(view.signals).toEqual({
      totalFocusHours: 0,
      distinctSubjects: [],
      longestStreak: 0,
    });
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.id, userId));
    await closeDb();
  });

  beforeEach(async () => {
    await db.delete(placements).where(eq(placements.islandId, islandId));
    await db
      .update(userStats)
      .set({ focusBalance: 1000, insightBalance: 0, level: 9 })
      .where(eq(userStats.userId, userId));
  });

  it('rejects an asset that is not in the manifest', async () => {
    await expect(
      placeAsset({ userId, assetId: 'lantern_bras', x: 0, z: 0, rotY: 0 }),
    ).rejects.toMatchObject({ code: 'VALIDATION' });
  });

  it('rejects terrain as a placement', async () => {
    await expect(
      placeAsset({
        userId,
        assetId: 'island_base_meadow',
        x: 0,
        z: 0,
        rotY: 0,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION' });
  });

  it('rejects a tile outside the island', async () => {
    await expect(
      placeAsset({ userId, assetId: LANTERN.id, x: 5, z: 0, rotY: 0 }),
    ).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(
      placeAsset({ userId, assetId: COTTAGE.id, x: 4, z: 4, rotY: 0 }),
    ).rejects.toMatchObject({ code: 'VALIDATION' });
  });

  it('debits the balance and inserts the row together', async () => {
    const result = await placeAsset({
      userId,
      assetId: LANTERN.id,
      x: 1,
      z: -2,
      rotY: 3,
    });

    expect(result.placement).toMatchObject({
      assetId: LANTERN.id,
      x: 1,
      z: -2,
      rotY: 3,
    });
    expect(result.stats.focusBalance).toBe(1000 - LANTERN.priceFocus);
    expect((await getIslandView(userId)).placements).toHaveLength(1);
  });

  it('rejects an occupied tile, including one under a wide footprint', async () => {
    await placeAsset({ userId, assetId: COTTAGE.id, x: 0, z: 0, rotY: 0 });

    await expect(
      placeAsset({ userId, assetId: LANTERN.id, x: 1, z: 1, rotY: 0 }),
    ).rejects.toMatchObject({ code: 'INVALID_STATE' });
  });

  it('refuses without enough Focus and creates no row', async () => {
    await db
      .update(userStats)
      .set({ focusBalance: 50 })
      .where(eq(userStats.userId, userId));

    await expect(
      placeAsset({ userId, assetId: LANTERN.id, x: 0, z: 0, rotY: 0 }),
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_FUNDS' });
    expect((await getIslandView(userId)).placements).toHaveLength(0);
    expect(await balance(userId)).toBe(50);
  });

  it('lets exactly one of two concurrent placements on one tile through', async () => {
    const attempt = () =>
      placeAsset({ userId, assetId: LANTERN.id, x: 2, z: 2, rotY: 0 });
    const results = await Promise.allSettled([attempt(), attempt()]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({
      code: 'INVALID_STATE',
    });
    expect(await balance(userId)).toBe(1000 - LANTERN.priceFocus);
  });

  it('refunds exactly half on removal, rounded down', async () => {
    const placed = await placeAsset({
      userId,
      assetId: LANTERN.id,
      x: -3,
      z: 3,
      rotY: 0,
    });
    const before = await balance(userId);

    const result = await removePlacement({
      userId,
      placementId: placed.placement.id,
    });

    expect(result.refund.focus).toBe(Math.floor(LANTERN.priceFocus / 2));
    expect(result.stats.focusBalance).toBe(
      before + Math.floor(LANTERN.priceFocus / 2),
    );
    expect((await getIslandView(userId)).placements).toHaveLength(0);
  });

  it('will not remove a placement that is not on this island', async () => {
    const other = await createUserWithDefaults({
      id: 'ignored',
      email: `island-other-${Date.now()}@test.local`,
      emailVerified: null,
    });
    await incrementBalances(db, other.id, { focus: 500 });
    const placed = await placeAsset({
      userId: other.id,
      assetId: LANTERN.id,
      x: 0,
      z: 0,
      rotY: 0,
    });

    await expect(
      removePlacement({ userId, placementId: placed.placement.id }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await db.delete(users).where(eq(users.id, other.id));
  });
});
