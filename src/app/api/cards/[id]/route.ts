import { z } from 'zod';
import { updateCardRequestSchema } from '@/domain/types';
import { handleRoute, ok } from '@/lib/api-response';
import { requireUserId } from '@/server/require-user';
import { editCard, removeCard } from '@/server/services/cards';

export const PATCH = handleRoute(async (req, ctx) => {
  const userId = await requireUserId();
  const cardId = z.uuid().parse((await ctx.params).id);
  const body = updateCardRequestSchema.parse(await req.json());
  return ok(await editCard({ userId, cardId, ...body }));
});

export const DELETE = handleRoute(async (_req, ctx) => {
  const userId = await requireUserId();
  const cardId = z.uuid().parse((await ctx.params).id);
  await removeCard({ userId, cardId });
  return ok({ removed: true });
});
