import { quizAnswerRequestSchema } from '@/domain/types';
import { handleRoute, ok } from '@/lib/api-response';
import { requireUserId } from '@/server/require-user';
import { answerQuizQuestion } from '@/server/services/session-quiz';

export const POST = handleRoute(async (req) => {
  const userId = await requireUserId();
  const body = quizAnswerRequestSchema.parse(await req.json());
  return ok(await answerQuizQuestion({ userId, ...body }));
});
