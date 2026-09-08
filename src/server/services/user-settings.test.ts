import { eq } from 'drizzle-orm';
import { DAILY_CREDITABLE_MS } from '@/domain/economy/constants';
import { closeDb, db } from '@/server/db';
import { users } from '@/server/db/schema';
import { findUserById } from '@/server/repositories/user';
import { createUserWithDefaults } from './user-bootstrap';
import {
  effectiveDailyCapMs,
  getProfile,
  setTimeZone,
  updateProfile,
} from './user-settings';

describe('user settings', () => {
  let userId = '';
  beforeAll(async () => {
    const user = await createUserWithDefaults({
      id: 'ignored',
      email: `settings-${Date.now()}@test.local`,
      emailVerified: null,
    });
    userId = user.id;
  });
  afterAll(async () => {
    await db.delete(users).where(eq(users.id, userId));
    await closeDb();
  });

  it('validates the zone and reports onboarding progress', async () => {
    await expect(setTimeZone(userId, 'Mars/Olympus')).rejects.toMatchObject({
      code: 'VALIDATION',
    });
    await setTimeZone(userId, 'Asia/Tokyo');
    const profile = await getProfile(userId);
    expect(profile).toMatchObject({
      timeZone: 'Asia/Tokyo',
      onboardedAt: null,
      dailyCapMs: null,
      progress: { hasNotes: false, hasSession: false, hasPlacement: false },
    });
  });

  it('only ever lowers the cap, and records onboarding once', async () => {
    const lowered = await updateProfile(userId, {
      dailyCapMs: 2 * 3_600_000,
      breakReminderMs: 25 * 60_000,
    });
    expect(lowered.dailyCapMs).toBe(2 * 3_600_000);
    expect(lowered.breakReminderMs).toBe(25 * 60_000);
    expect(effectiveDailyCapMs(await findUserById(db, userId))).toBe(
      2 * 3_600_000,
    );
    expect(effectiveDailyCapMs({ dailyCapMs: 99 * 3_600_000 })).toBe(
      DAILY_CREDITABLE_MS,
    );
    expect(effectiveDailyCapMs(null)).toBe(DAILY_CREDITABLE_MS);

    const reset = await updateProfile(userId, { dailyCapMs: null });
    expect(reset.dailyCapMs).toBeNull();
    await expect(
      updateProfile(userId, { timeZone: 'Nope/Nope' }),
    ).rejects.toMatchObject({ code: 'VALIDATION' });

    const onboarded = await updateProfile(userId, { onboarded: true });
    expect(onboarded.onboardedAt).not.toBeNull();
    const untouched = await updateProfile(userId, {});
    expect(untouched.onboardedAt).toEqual(onboarded.onboardedAt);
  });
});
