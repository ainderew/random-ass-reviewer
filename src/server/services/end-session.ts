import { countedMs } from '@/domain/session/elapsed';
import { bowlsFilled } from '@/domain/pet/care';
import { studyGain } from '@/domain/pet/happiness';
import { MIN_SESSION_MS } from '@/domain/economy/constants';
import { env } from '@/lib/env';
import { applyDailyCap } from '@/domain/economy/currency';
import { updateStreak } from '@/domain/economy/streak';
import { localDayKey, startOfLocalDay } from '@/domain/time/local-day';
import type { SessionResult } from '@/domain/types';
import { db } from '@/server/db';
import { AppError } from '@/server/errors';
import {
  claimSessionForEnd,
  findSessionById,
  sumCreditedAllTime,
  sumCreditedSince,
  updateFocusSession,
} from '@/server/repositories/focus-session';
import { studiedTogether } from '@/server/repositories/pet';
import { findUserById } from '@/server/repositories/user';
import {
  findUserStats,
  updateStreakFields,
} from '@/server/repositories/user-stats';
import { effectiveDailyCapMs } from './user-settings';

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

    const focusedMs = countedMs(session, endedAt.getTime());
    const base = {
      sessionId: session.id,
      mode: session.mode ?? 'focus',
      focusedMs,
      streak: null,
    };

    // A short session is a person trying. Save it without streak credit.
    if (focusedMs < (env.MIN_SESSION_MS_OVERRIDE ?? MIN_SESSION_MS)) {
      await updateFocusSession(tx, session.id, { focusedMs, creditedMs: 0 });
      // Still time together, so she does not start missing you.
      await studiedTogether(tx, input.userId, { gain: 0, now: endedAt });
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
    await updateFocusSession(tx, session.id, { focusedMs, creditedMs });

    // The study cat: time together raises her happiness, and the credited
    // focus fills her kibble. Derived from lifetime focus, never stored twice.
    const focusAfterMs = await sumCreditedAllTime(tx, input.userId);
    const cat = await studiedTogether(tx, input.userId, {
      gain: studyGain(creditedMs),
      now: endedAt,
    });

    return {
      ...base,
      creditedMs,
      cappedByDailyLimit: creditedMs < focusedMs,
      belowMinimum: false,
      streak: {
        days: streakUpdate.streak,
        freezeUsed: streakUpdate.freezeUsed,
        freezesRemaining: streakUpdate.freezesRemaining,
        milestone: streakUpdate.milestone,
      },
      pet: {
        name: cat.name,
        bowlsFilled: bowlsFilled(focusAfterMs - creditedMs, creditedMs),
      },
    };
  });
}
