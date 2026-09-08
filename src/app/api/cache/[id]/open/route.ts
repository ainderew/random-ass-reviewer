import { z } from 'zod';
import { handleRoute, ok } from '@/lib/api-response';
import { requireUserId } from '@/server/require-user';
import { openCache } from '@/server/services/cache';

export const POST = handleRoute(async (_req, ctx) => {
  const userId = await requireUserId();
  const { id } = await ctx.params;
  const cacheId = z.uuid().parse(id);
  return ok(await openCache({ userId, cacheId }));
});
