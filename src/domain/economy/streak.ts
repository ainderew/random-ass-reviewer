export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100] as const;
export const FREEZES_PER_MONTH = 2;

export interface StreakUpdate {
  streak: number;
  freezesRemaining: number;
  freezeUsed: boolean;
  milestone: number | null;
}

// 'YYYY-MM-DD' keys, already in the user's timezone. Never UTC here.
function dayNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Math.round(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1) / 86_400_000);
}

// Consecutive days count up. Exactly one missed day spends a freeze on the
// user's behalf, silently. Anything worse starts again at 1, because today
// still counts. Freezes come back at the start of each calendar month.
export function updateStreak(input: {
  lastSessionDate: string | null;
  todayDate: string;
  currentStreak: number;
  freezesRemaining: number;
}): StreakUpdate {
  const { lastSessionDate, todayDate } = input;
  const monthChanged =
    !lastSessionDate || lastSessionDate.slice(0, 7) !== todayDate.slice(0, 7);
  let freezes = monthChanged ? FREEZES_PER_MONTH : input.freezesRemaining;

  let streak: number;
  let freezeUsed = false;
  if (!lastSessionDate) {
    streak = 1;
  } else {
    const gap = dayNumber(todayDate) - dayNumber(lastSessionDate);
    if (gap <= 0) {
      return {
        streak: Math.max(1, input.currentStreak),
        freezesRemaining: freezes,
        freezeUsed: false,
        milestone: null,
      };
    }
    if (gap === 1) {
      streak = input.currentStreak + 1;
    } else if (gap === 2 && freezes > 0) {
      freezes -= 1;
      freezeUsed = true;
      streak = input.currentStreak + 1;
    } else {
      streak = 1;
    }
  }

  const milestone = (STREAK_MILESTONES as readonly number[]).includes(streak)
    ? streak
    : null;
  return { streak, freezesRemaining: freezes, freezeUsed, milestone };
}

export interface StreakSummary {
  days: number;
  todayDone: boolean;
  freezesRemaining: number;
  freezePending: boolean;
  nextMilestone: number | null;
  minimumMinutes: number;
}

// Preview the existing session rules without awarding a day or spending a
// freeze. Old saved streaks must not look active after a long absence.
export function summarizeStreak(
  input: Parameters<typeof updateStreak>[0],
  minimumMinutes = 5,
): StreakSummary {
  const next = updateStreak(input);
  const todayDone =
    input.lastSessionDate !== null && input.lastSessionDate >= input.todayDate;
  const days = todayDone
    ? input.currentStreak
    : next.streak > 1
      ? input.currentStreak
      : 0;
  return {
    days,
    todayDone,
    freezesRemaining: next.freezesRemaining + Number(next.freezeUsed),
    freezePending: next.freezeUsed,
    nextMilestone: STREAK_MILESTONES.find((n) => n > days) ?? null,
    minimumMinutes,
  };
}
