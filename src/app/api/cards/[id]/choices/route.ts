import { z } from 'zod';
import { handleRoute, ok } from '@/lib/api-response';
import { getProviderForUser } from '@/server/llm/factory';
import { requireUserId } from '@/server/require-user';
import { makeChoices } from '@/server/services/card-choices';
import { assertRateLimit } from '@/server/services/rate-limit';

// One model call, so it waits for the answer: the student is looking at the card.
export const POST = handleRoute(async (_req, ctx) => {
  const userId = await requireUserId();
  const cardId = z.uuid().parse((await ctx.params).id);
  await assertRateLimit(userId, 'cards:choices');
  const provider = await getProviderForUser(userId);
  return ok({ quiz: await makeChoices({ userId, cardId, provider }) });
});
