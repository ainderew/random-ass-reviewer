import { mistakeAnswerSchema } from '@/domain/types/mistakes';
import { handleRoute, ok } from '@/lib/api-response';
import { requireUserId } from '@/server/require-user';
import {
  answerMistakeCheck,
  getMistakeChecks,
} from '@/server/services/mistakes';
export const GET = handleRoute(async () =>
  ok(await getMistakeChecks(await requireUserId())),
);
export const POST = handleRoute(async (req) => {
  const userId = await requireUserId();
  return ok(
    await answerMistakeCheck(
      userId,
      mistakeAnswerSchema.parse(await req.json()),
    ),
  );
});
