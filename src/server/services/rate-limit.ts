import { db } from '@/server/db';
import { AppError } from '@/server/errors';
import { hitWindow } from '@/server/repositories/rate-limit';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

// Per user, per window, on the endpoints where abuse is expensive. The
// notes limit is the one that matters: it is the only call that costs money.
export const RATE_LIMITS = {
  'notes:create': { limit: 20, windowMs: HOUR },
  'island:place': { limit: 120, windowMs: MINUTE },
  'review:answer': { limit: 300, windowMs: MINUTE },
  'settings:api-key': { limit: 5, windowMs: HOUR },
} as const;

export type RateLimitBucket = keyof typeof RATE_LIMITS;

export async function assertRateLimit(
  userId: string,
  bucket: RateLimitBucket,
  now = new Date(),
): Promise<void> {
  const { limit, windowMs } = RATE_LIMITS[bucket];
  const hit = await hitWindow(db, { userId, bucket, windowMs, now });
  if (hit.count <= limit) return;
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((hit.windowStart.getTime() + windowMs - now.getTime()) / 1000),
  );
  throw new AppError(
    'RATE_LIMITED',
    `Slow down a moment. Try again in ${describe(retryAfterSeconds)}.`,
    429,
    { retryAfterSeconds },
  );
}

function describe(seconds: number): string {
  if (seconds < 90) return `${seconds} seconds`;
  return `${Math.ceil(seconds / 60)} minutes`;
}
