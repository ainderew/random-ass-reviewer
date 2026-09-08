import { and, eq, sql } from 'drizzle-orm';
import type { DbOrTx } from '@/server/db';
import { llmUsage } from '@/server/db/schema';

export interface MonthUsage {
  inputTokens: number;
  outputTokens: number;
  costCents: number;
}

// Atomic upsert. Concurrent chunks add up correctly.
export async function addUsage(
  tx: DbOrTx,
  input: {
    userId: string;
    month: string;
    inputTokens: number;
    outputTokens: number;
    costCents: number;
  },
): Promise<void> {
  await tx
    .insert(llmUsage)
    .values(input)
    .onConflictDoUpdate({
      target: [llmUsage.userId, llmUsage.month],
      set: {
        inputTokens: sql`${llmUsage.inputTokens} + ${input.inputTokens}`,
        outputTokens: sql`${llmUsage.outputTokens} + ${input.outputTokens}`,
        costCents: sql`${llmUsage.costCents} + ${input.costCents}`,
      },
    });
}

export async function findMonthUsage(
  tx: DbOrTx,
  input: { userId: string; month: string },
): Promise<MonthUsage> {
  const row = await tx.query.llmUsage.findFirst({
    where: and(
      eq(llmUsage.userId, input.userId),
      eq(llmUsage.month, input.month),
    ),
  });
  return row
    ? {
        inputTokens: row.inputTokens,
        outputTokens: row.outputTokens,
        costCents: row.costCents,
      }
    : { inputTokens: 0, outputTokens: 0, costCents: 0 };
}
