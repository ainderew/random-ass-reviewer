import { env } from '@/lib/env';
import { db } from '@/server/db';
import { AppError } from '@/server/errors';
import { costCents } from '@/server/llm/pricing';
import type { TokenUsage } from '@/server/llm/types';
import { addUsage, findMonthUsage } from '@/server/repositories/llm-usage';

export function monthKey(now = new Date()): string {
  return now.toISOString().slice(0, 7);
}

// Check before the call, never after. A user already over quota costs nothing more.
export async function assertWithinQuota(userId: string): Promise<void> {
  const usage = await findMonthUsage(db, { userId, month: monthKey() });
  if (usage.costCents >= env.MONTHLY_LLM_QUOTA_CENTS) {
    throw new AppError(
      'RATE_LIMITED',
      'Monthly AI limit reached. Add your own Anthropic key in settings to keep going.',
    );
  }
}

// Fractional cents accumulate as tenths so small calls are not rounded away.
export async function recordUsage(
  userId: string,
  usage: TokenUsage,
  model: string,
): Promise<void> {
  const cents = Math.ceil(costCents(model, usage) * 10) / 10;
  await addUsage(db, {
    userId,
    month: monthKey(),
    inputTokens:
      usage.inputTokens +
      usage.cacheCreationInputTokens +
      usage.cacheReadInputTokens,
    outputTokens: usage.outputTokens,
    costCents: Math.ceil(cents),
  });
}
