import { handleRoute, ok } from '@/lib/api-response';
import { requireUserId } from '@/server/require-user';
import { getProgressOverview } from '@/server/services/progress-overview';

export const GET = handleRoute(async () =>
  ok(await getProgressOverview(await requireUserId())),
);
