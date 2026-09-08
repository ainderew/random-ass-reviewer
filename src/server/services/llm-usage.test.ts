import { eq } from 'drizzle-orm';
import { env } from '@/lib/env';
import { closeDb, db } from '@/server/db';
import { users } from '@/server/db/schema';
import { addUsage, findMonthUsage } from '@/server/repositories/llm-usage';
import { assertWithinQuota, monthKey, recordUsage } from './llm-usage';
import { createUserWithDefaults } from './user-bootstrap';

describe('llm usage', () => {
  let userId = '';
  beforeAll(async () => {
    const user = await createUserWithDefaults({
      id: 'ignored',
      email: `usage-${Date.now()}@test.local`,
      emailVerified: null,
    });
    userId = user.id;
  });
  afterAll(async () => {
    await db.delete(users).where(eq(users.id, userId));
    await closeDb();
  });

  it('keys months in UTC, rounds tiny calls up to a cent, and stops at the quota', async () => {
    expect(monthKey(new Date('2026-09-30T23:59:59Z'))).toBe('2026-09');
    await assertWithinQuota(userId);
    await recordUsage(
      userId,
      {
        inputTokens: 100,
        outputTokens: 10,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
      },
      'claude-opus-5',
    );
    const usage = await findMonthUsage(db, { userId, month: monthKey() });
    expect(usage).toMatchObject({
      inputTokens: 100,
      outputTokens: 10,
      costCents: 1,
    });

    await addUsage(db, {
      userId,
      month: monthKey(),
      inputTokens: 0,
      outputTokens: 0,
      costCents: env.MONTHLY_LLM_QUOTA_CENTS,
    });
    await expect(assertWithinQuota(userId)).rejects.toMatchObject({
      code: 'RATE_LIMITED',
    });
  });
});
