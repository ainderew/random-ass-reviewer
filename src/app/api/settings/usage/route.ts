import { handleRoute, ok } from '@/lib/api-response';
import { requireUserId } from '@/server/require-user';
import { getUsageSummary } from '@/server/services/settings';

export const GET = handleRoute(async () =>
  ok(await getUsageSummary(await requireUserId())),
);
