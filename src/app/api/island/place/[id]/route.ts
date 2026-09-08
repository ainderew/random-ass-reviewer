import { z } from 'zod';
import { handleRoute, ok } from '@/lib/api-response';
import { requireUserId } from '@/server/require-user';
import { removePlacement } from '@/server/services/island';

export const DELETE = handleRoute(async (_req, ctx) => {
  const userId = await requireUserId();
  const { id } = await ctx.params;
  const placementId = z.uuid().parse(id);
  return ok(await removePlacement({ userId, placementId }));
});
