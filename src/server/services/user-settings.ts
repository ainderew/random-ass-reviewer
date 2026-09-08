import { DAILY_CREDITABLE_MS } from '@/domain/economy/constants';
import type { Profile, UpdateProfileRequest } from '@/domain/types';
import { db } from '@/server/db';
import { AppError } from '@/server/errors';
import { countSessionsSince } from '@/server/repositories/focus-session';
import {
  countPlacements,
  findIslandByUserId,
} from '@/server/repositories/island';
import { countNoteSources } from '@/server/repositories/note';
import {
  findUserById,
  updateUserPreferences,
} from '@/server/repositories/user';

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

// The browser knows the real zone; the server only needs it for day
// boundaries on caps and streaks.
export async function setTimeZone(
  userId: string,
  timeZone: string,
): Promise<void> {
  if (!isValidTimeZone(timeZone))
    throw new AppError('VALIDATION', 'Unknown time zone');
  await updateUserPreferences(db, userId, { timezone: timeZone });
}

export async function getProfile(userId: string): Promise<Profile> {
  const user = await findUserById(db, userId);
  if (!user) throw new AppError('NOT_FOUND', 'User not found');
  const island = await findIslandByUserId(db, userId);
  const [notes, sessions, placements] = await Promise.all([
    countNoteSources(db, userId),
    countSessionsSince(db, userId, new Date(0)),
    island ? countPlacements(db, island.id) : Promise.resolve(0),
  ]);
  return {
    timeZone: user.timezone,
    onboardedAt: user.onboardedAt,
    dailyCapMs: user.dailyCapMs,
    breakReminderMs: user.breakReminderMs,
    progress: {
      hasNotes: notes > 0,
      hasSession: sessions > 0,
      hasPlacement: placements > 0,
    },
  };
}

// The cap only moves down. The schema already refuses anything above the
// product maximum; this is the belt to that brace.
export async function updateProfile(
  userId: string,
  patch: UpdateProfileRequest,
): Promise<Profile> {
  if (patch.timeZone !== undefined && !isValidTimeZone(patch.timeZone)) {
    throw new AppError('VALIDATION', 'Unknown time zone');
  }
  await updateUserPreferences(db, userId, {
    ...(patch.timeZone !== undefined ? { timezone: patch.timeZone } : {}),
    ...(patch.onboarded ? { onboardedAt: new Date() } : {}),
    ...(patch.dailyCapMs !== undefined
      ? {
          dailyCapMs:
            patch.dailyCapMs === null
              ? null
              : Math.min(patch.dailyCapMs, DAILY_CREDITABLE_MS),
        }
      : {}),
    ...(patch.breakReminderMs !== undefined
      ? { breakReminderMs: patch.breakReminderMs }
      : {}),
  });
  return getProfile(userId);
}

// The effective cap for today's crediting.
export function effectiveDailyCapMs(
  user: { dailyCapMs: number | null } | null,
): number {
  if (!user || user.dailyCapMs === null) return DAILY_CREDITABLE_MS;
  return Math.min(user.dailyCapMs, DAILY_CREDITABLE_MS);
}
