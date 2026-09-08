import { after } from 'next/server';
import { z } from 'zod';
import { handleRoute, ok } from '@/lib/api-response';
import { getProviderForUser } from '@/server/llm/factory';
import { requireUserId } from '@/server/require-user';
import { getNoteDetail, retryGeneration } from '@/server/services/notes';

// Re-runs generation for sections without cards. Ownership is checked before
// the response; the work itself runs after it.
export const POST = handleRoute(async (_req, ctx) => {
  const userId = await requireUserId();
  const sourceId = z.uuid().parse((await ctx.params).id);
  await getNoteDetail({ userId, sourceId });
  const provider = await getProviderForUser(userId);
  after(() => retryGeneration({ userId, sourceId, provider }));
  return ok({ started: true }, 202);
});
