import { handleRoute, ok } from '@/lib/api-response';
import { requireUserId } from '@/server/require-user';
import { getStatsSnapshot } from '@/server/services/user-stats';

export const GET = handleRoute(async () =>
  ok(await getStatsSnapshot(await requireUserId())),
);
