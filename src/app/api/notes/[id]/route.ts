import { z } from 'zod';
import { handleRoute, ok } from '@/lib/api-response';
import { requireUserId } from '@/server/require-user';
import { getNoteDetail, removeNote } from '@/server/services/notes';

export const GET = handleRoute(async (_req, ctx) => {
  const userId = await requireUserId();
  const sourceId = z.uuid().parse((await ctx.params).id);
  return ok(await getNoteDetail({ userId, sourceId }));
});

export const DELETE = handleRoute(async (_req, ctx) => {
  const userId = await requireUserId();
  const sourceId = z.uuid().parse((await ctx.params).id);
  await removeNote({ userId, sourceId });
  return ok({ removed: true });
});
