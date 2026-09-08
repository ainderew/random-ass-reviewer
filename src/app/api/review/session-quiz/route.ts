import { z } from 'zod';
import { quizFinishRequestSchema } from '@/domain/types';
import { handleRoute, ok } from '@/lib/api-response';
import { requireUserId } from '@/server/require-user';
import {
  finishSessionQuiz,
  getSessionQuiz,
} from '@/server/services/session-quiz';

// The GET body carries questions and options only. The key stays on the server.
export const GET = handleRoute(async (req) => {
  const userId = await requireUserId();
  const sessionId = z
    .uuid()
    .parse(new URL(req.url).searchParams.get('sessionId'));
  return ok(await getSessionQuiz({ userId, sessionId }));
});

// Finish: sets the multiplier once from the answers already recorded.
export const POST = handleRoute(async (req) => {
  const userId = await requireUserId();
  const body = quizFinishRequestSchema.parse(await req.json());
  return ok(await finishSessionQuiz({ userId, ...body }));
});
