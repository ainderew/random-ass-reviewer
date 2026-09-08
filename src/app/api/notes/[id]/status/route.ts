import { z } from 'zod';
import { handleRoute, ok } from '@/lib/api-response';
import { requireUserId } from '@/server/require-user';
import { getProgress } from '@/server/services/generation-progress';

export const GET = handleRoute(async (_req, ctx) => {
  const userId = await requireUserId();
  const sourceId = z.uuid().parse((await ctx.params).id);
  return ok(await getProgress(userId, sourceId));
});
