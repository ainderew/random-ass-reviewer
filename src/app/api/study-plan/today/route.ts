import { handleRoute, ok } from '@/lib/api-response';
import { requireUserId } from '@/server/require-user';
import { getTodayPlan } from '@/server/services/today-plan';
export const GET = handleRoute(async () =>
  ok(await getTodayPlan(await requireUserId())),
);
