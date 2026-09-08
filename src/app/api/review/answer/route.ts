import { reviewAnswerRequestSchema } from '@/domain/types';
import { handleRoute, ok } from '@/lib/api-response';
import { requireUserId } from '@/server/require-user';
import { assertRateLimit } from '@/server/services/rate-limit';
import { submitAnswer } from '@/server/services/review';

export const POST = handleRoute(async (req) => {
  const userId = await requireUserId();
  await assertRateLimit(userId, 'review:answer');
  const body = reviewAnswerRequestSchema.parse(await req.json());
  return ok(await submitAnswer({ userId, ...body }));
});
