import { handleRoute, ok } from '@/lib/api-response';
import { requireUserId } from '@/server/require-user';
import { getStudyPlan } from '@/server/services/study-plan';
export const GET = handleRoute(async () =>
  ok(await getStudyPlan(await requireUserId())),
);
