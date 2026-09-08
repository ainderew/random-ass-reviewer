import { eq } from 'drizzle-orm';
import { starterAssetIds } from '@/domain/economy/unlocks';
import { closeDb, db } from '@/server/db';
import { caches, focusSessions, users } from '@/server/db/schema';
import {
  findIslandByUserId,
  insertPlacement,
} from '@/server/repositories/island';
import { getOwnership } from './inventory';
import { createUserWithDefaults } from './user-bootstrap';

describe('ownership', () => {
  let userId = '';
  beforeAll(async () => {
    const user = await createUserWithDefaults({
      id: 'ignored',
      email: `own-${Date.now()}@test.local`,
      emailVerified: null,
    });
    userId = user.id;
  });
  afterAll(async () => {
    await db.delete(users).where(eq(users.id, userId));
    await closeDb();
  });

  it('is starters plus opened caches, with free credits for won pieces not yet placed', async () => {
    const island = (await findIslandByUserId(db, userId))!;
    const before = await getOwnership(db, userId, island.id);
    expect(before.ownedAssetIds).toEqual([...starterAssetIds()]);
    expect(before.freeCredits).toEqual({});

    const [session] = await db
      .insert(focusSessions)
      .values({
        userId,
        lootSeed: 'x',
        startedAt: new Date(),
        status: 'completed',
      })
      .returning();
    await db.insert(caches).values([
      {
        userId,
        sessionId: session!.id,
        rarity: 'rare',
        contents: { focus: 0, insight: 0, assetIds: ['fountain_stone'] },
        openedAt: new Date(),
      },
    ]);
    const won = await getOwnership(db, userId, island.id);
    expect(won.ownedAssetIds).toContain('fountain_stone');
    expect(won.freeCredits).toEqual({ fountain_stone: 1 });

    await insertPlacement(db, {
      islandId: island.id,
      assetId: 'fountain_stone',
      x: 0,
      z: 0,
      rotY: 0,
    });
    const placed = await getOwnership(db, userId, island.id);
    expect(placed.freeCredits).toEqual({});
    expect(placed.ownedAssetIds).toContain('fountain_stone');
  });
});
