import { MIN_SESSION_MS } from '@/domain/economy/constants';
import { env } from '@/lib/env';
import { applyDailyCap, calculateFocusAward } from '@/domain/economy/currency';
import { rollCache } from '@/domain/economy/loot';
import { milestoneInsight, updateStreak } from '@/domain/economy/streak';
import { unlocksForLevel } from '@/domain/economy/unlocks';
import { levelForXp } from '@/domain/economy/xp';
import { MAX_HEARTBEATS_PER_SESSION } from '@/domain/session/constants';
import {
  accumulateFocusedMs,
  type BeatSample,
} from '@/domain/session/validation';
import { localDayKey, startOfLocalDay } from '@/domain/time/local-day';
import type { SessionResult } from '@/domain/types';
import { db, type DbOrTx } from '@/server/db';
import { AppError } from '@/server/errors';
import { insertCache } from '@/server/repositories/cache';
import {
  claimSessionForEnd,
  findSessionById,
  sumCreditedSince,
  updateFocusSession,
} from '@/server/repositories/focus-session';
import { listHeartbeats } from '@/server/repositories/heartbeat';
import { findIslandByUserId } from '@/server/repositories/island';
import { findUserById } from '@/server/repositories/user';
import {
  findUserStats,
  incrementBalances,
  setLevel,
  setPityCounter,
  updateStreakFields,
} from '@/server/repositories/user-stats';
import { getOwnership } from './inventory';
import { effectiveDailyCapMs } from './user-settings';

const PAGE = 500;

async function loadAllBeats(
  tx: DbOrTx,
  sessionId: string,
): Promise<BeatSample[]> {
  const beats: BeatSample[] = [];
  for (let offset = 0; offset < MAX_HEARTBEATS_PER_SESSION; offset += PAGE) {
    const page = await listHeartbeats(tx, sessionId, { limit: PAGE, offset });
    for (const beat of page)
      beats.push({ atMs: beat.at.getTime(), focused: beat.focused });
    if (page.length < PAGE) break;
  }
  return beats;
}

// One transaction: claim the session, recompute focused time from the
// heartbeats the server stamped, apply the daily cap, pay, update the
// streak, roll the cache. A crash anywhere in here rolls all of it back.
export async function endSession(input: {
  userId: string;
  sessionId: string;
}): Promise<SessionResult> {
  return db.transaction(async (tx) => {
    const existing = await findSessionById(tx, input.sessionId);
    if (!existing || existing.userId !== input.userId) {
      throw new AppError('NOT_FOUND', 'Session not found');
    }

    const endedAt = new Date();
    const session = await claimSessionForEnd(tx, { ...input, endedAt });
    if (!session) throw new AppError('INVALID_STATE', 'Session already ended');

    const focusedMs = accumulateFocusedMs(await loadAllBeats(tx, session.id));
    const base = {
      sessionId: session.id,
      focusedMs,
      xpAwarded: 0,
      focusAwarded: 0,
      quizMultiplier: session.quizMultiplier,
      levelUp: null,
      streak: null,
      cache: null,
    };

    // A short session is a person trying. Log it, pay nothing, no error.
    if (focusedMs < (env.MIN_SESSION_MS_OVERRIDE ?? MIN_SESSION_MS)) {
      await updateFocusSession(tx, session.id, { focusedMs, creditedMs: 0 });
      return {
        ...base,
        creditedMs: 0,
        cappedByDailyLimit: false,
        belowMinimum: true,
      };
    }

    const user = await findUserById(tx, input.userId);
    const timeZone = user?.timezone ?? 'UTC';
    const nowMs = endedAt.getTime();
    const dayStart = new Date(startOfLocalDay(nowMs, timeZone));
    const alreadyCreditedTodayMs = await sumCreditedSince(
      tx,
      input.userId,
      dayStart,
    );
    const creditedMs = applyDailyCap({
      focusedMs,
      alreadyCreditedTodayMs,
      capMs: effectiveDailyCapMs(user),
    });
    const award = calculateFocusAward({
      creditedMs,
      multiplier: session.quizMultiplier,
    });

    const before = await findUserStats(tx, input.userId);
    if (!before) throw new AppError('NOT_FOUND', 'User stats not found');

    // Streak, in the user's own day.
    const streakUpdate = updateStreak({
      lastSessionDate: before.lastSessionDate,
      todayDate: localDayKey(nowMs, timeZone),
      currentStreak: before.streakDays,
      freezesRemaining: before.streakFreezes,
    });
    await updateStreakFields(tx, input.userId, {
      streakDays: streakUpdate.streak,
      streakFreezes: streakUpdate.freezesRemaining,
      lastSessionDate: localDayKey(nowMs, timeZone),
    });
    const bonusInsight = milestoneInsight(streakUpdate.milestone);

    const stats = await incrementBalances(tx, input.userId, {
      focus: award,
      insight: bonusInsight,
      xp: award,
    });
    const level = levelForXp(stats.xp);
    if (level !== stats.level) await setLevel(tx, input.userId, level);
    const levelUp =
      level > before.level ? { level, unlocks: unlocksForLevel(level) } : null;

    // The cache is rolled from the seed fixed at session start. Contents stay
    // server-side until the user opens it.
    let cache: { id: string } | null = null;
    const island = await findIslandByUserId(tx, input.userId);
    const ownership = island
      ? await getOwnership(tx, input.userId, island.id)
      : null;
    const roll = rollCache({
      seed: session.lootSeed,
      creditedMs,
      pityCounter: before.pityCounter,
      ownedAssetIds: ownership?.ownedAssetIds ?? [],
    });
    if (roll) {
      const inserted = await insertCache(tx, {
        userId: input.userId,
        sessionId: session.id,
        rarity: roll.rarity,
        contents: roll.contents,
      });
      await setPityCounter(tx, input.userId, roll.nextPityCounter);
      cache = { id: inserted.id };
    }

    await updateFocusSession(tx, session.id, { focusedMs, creditedMs });

    return {
      ...base,
      creditedMs,
      focusAwarded: award,
      xpAwarded: award,
      cappedByDailyLimit: creditedMs < focusedMs,
      belowMinimum: false,
      levelUp,
      streak: {
        days: streakUpdate.streak,
        freezeUsed: streakUpdate.freezeUsed,
        freezesRemaining: streakUpdate.freezesRemaining,
        milestone: streakUpdate.milestone,
        milestoneInsight: bonusInsight,
      },
      cache,
    };
  });
}
