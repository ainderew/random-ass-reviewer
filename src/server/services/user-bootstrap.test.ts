import { eq } from 'drizzle-orm';
import { closeDb, db } from '@/server/db';
import { isUniqueViolation } from '@/server/db/errors';
import { userStats, users } from '@/server/db/schema';
import { createUserWithDefaults } from './user-bootstrap';

describe('createUserWithDefaults', () => {
  const email = `bootstrap-${Date.now()}@test.local`;
  const createdIds: string[] = [];

  afterAll(async () => {
    for (const id of createdIds) {
      await db.delete(users).where(eq(users.id, id));
    }
    await closeDb();
  });

  it('creates the user with exactly one user_stats row ', async () => {
    const user = await createUserWithDefaults({
      id: 'provider-id-is-ignored',
      email,
      emailVerified: null,
      name: 'Test Student',
      image: null,
    });
    createdIds.push(user.id);

    const stats = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, user.id));

    expect(user.id).not.toBe('provider-id-is-ignored');
    expect(user.email).toBe(email);
    expect(stats).toHaveLength(1);
    expect(stats[0]).toMatchObject({
      streakDays: 0,
      streakFreezes: 2,
    });
  });

  it('rejects a second account with the same email', async () => {
    const error = await createUserWithDefaults({
      id: 'x',
      email,
      emailVerified: null,
    }).catch((e: unknown) => e);

    expect(isUniqueViolation(error)).toBe(true);
    expect(
      await db.select().from(users).where(eq(users.email, email)),
    ).toHaveLength(1);
  });
});
