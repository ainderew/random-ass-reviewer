import { handleRoute, ok } from '@/lib/api-response';
import { requireUserId } from '@/server/require-user';
import { getLearningProgress } from '@/server/services/learning-progress';
export const GET = handleRoute(async () =>
  ok(await getLearningProgress(await requireUserId())),
);
