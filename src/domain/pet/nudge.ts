import { MISSES_YOU_AFTER_MS, petMood } from './happiness';

// The push notification the cat sends when you have been away. At most one
// a day, only in waking hours on the student's own clock, and only after
// she has gone 18 hours without you. The wording is direct by the owner's
// choice: she misses you, and it is time to study.

export const NUDGE_GAP_MS = 20 * 3_600_000;
export const NUDGE_FROM_HOUR = 10;
export const NUDGE_UNTIL_HOUR = 21;

export interface NudgeTiming {
  lastTogether: Date;
  lastNudged: Date | null;
  now: Date;
  timeZone: string;
}

export function localHour(now: Date, timeZone: string): number {
  let format: Intl.DateTimeFormat;
  try {
    format = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      hourCycle: 'h23',
    });
  } catch {
    format = new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      hour: 'numeric',
      hourCycle: 'h23',
    });
  }
  return Number(format.format(now)) % 24;
}

export function nudgeDue(t: NudgeTiming): boolean {
  const now = t.now.getTime();
  if (now - t.lastTogether.getTime() < MISSES_YOU_AFTER_MS) return false;
  if (t.lastNudged && now - t.lastNudged.getTime() < NUDGE_GAP_MS) return false;
  const hour = localHour(t.now, t.timeZone);
  return hour >= NUDGE_FROM_HOUR && hour < NUDGE_UNTIL_HOUR;
}

export interface NudgeCopy {
  title: string;
  body: string;
}

export function nudgeCopy(pet: {
  name: string;
  happiness: number;
  bowlsWaiting: number;
}): NudgeCopy {
  const mood = petMood(pet.happiness);
  if (mood === 'sad') {
    return {
      title: `${pet.name} is sad`,
      body: 'She has not seen you in days. Time to study!',
    };
  }
  if (pet.bowlsWaiting > 0) {
    return {
      title: `${pet.name} is hungry`,
      body: 'Her kibble is waiting. Feed her, then study together.',
    };
  }
  return {
    title: `${pet.name} misses you`,
    body: 'Time to study! She is waiting by the window.',
  };
}
