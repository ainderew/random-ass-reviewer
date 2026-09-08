import { eq } from 'drizzle-orm';
import { closeDb, db } from '@/server/db';
import { users } from '@/server/db/schema';
import { assertRateLimit, RATE_LIMITS } from './rate-limit';
import { createUserWithDefaults } from './user-bootstrap';

describe('rate limit', () => {
  let userId = '';

  beforeAll(async () => {
    const user = await createUserWithDefaults({
      id: 'ignored',
      email: `rate-${Date.now()}@test.local`,
      emailVerified: null,
    });
    userId = user.id;
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.id, userId));
  });

  it('allows the limit, refuses the next call with a retry time, and resets after the window', async () => {
    const { limit, windowMs } = RATE_LIMITS['notes:create'];
    const start = new Date('2026-09-08T10:00:00Z');
    for (let i = 0; i < limit; i += 1) {
      await expect(
        assertRateLimit(userId, 'notes:create', start),
      ).resolves.toBeUndefined();
    }
    await expect(
      assertRateLimit(userId, 'notes:create', start),
    ).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      status: 429,
      retryAfterSeconds: windowMs / 1000,
    });
    // Other buckets are independent.
    await expect(
      assertRateLimit(userId, 'island:place', start),
    ).resolves.toBeUndefined();
    // A new window starts clean.
    const later = new Date(start.getTime() + windowMs + 1000);
    await expect(
      assertRateLimit(userId, 'notes:create', later),
    ).resolves.toBeUndefined();
  });
});

describe('rate limit messages', () => {
  it('says minutes for long waits', async () => {
    const user = await createUserWithDefaults({
      id: 'ignored',
      email: `rate-msg-${Date.now()}@test.local`,
      emailVerified: null,
    });
    const start = new Date('2026-09-08T11:00:00Z');
    for (let i = 0; i < RATE_LIMITS['settings:api-key'].limit; i += 1) {
      await assertRateLimit(user.id, 'settings:api-key', start);
    }
    await expect(
      assertRateLimit(user.id, 'settings:api-key', start),
    ).rejects.toMatchObject({
      message: expect.stringMatching(/60 minutes/),
    });
    await db.delete(users).where(eq(users.id, user.id));
  });
});

afterAll(() => closeDb());

describe('rate limit short waits', () => {
  it('says seconds when the window is nearly over', async () => {
    const user = await createUserWithDefaults({
      id: 'ignored',
      email: `rate-sec-${Date.now()}@test.local`,
      emailVerified: null,
    });
    const { limit, windowMs } = RATE_LIMITS['island:place'];
    const start = new Date('2026-09-08T12:00:00Z');
    for (let i = 0; i < limit; i += 1)
      await assertRateLimit(user.id, 'island:place', start);
    const late = new Date(start.getTime() + windowMs - 5000);
    await expect(
      assertRateLimit(user.id, 'island:place', late),
    ).rejects.toMatchObject({
      message: expect.stringMatching(/5 seconds/),
      retryAfterSeconds: 5,
    });
    await db.delete(users).where(eq(users.id, user.id));
  });
});
