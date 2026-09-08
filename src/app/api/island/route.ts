import { handleRoute, ok } from '@/lib/api-response';
import { requireUserId } from '@/server/require-user';
import { getIslandView } from '@/server/services/island';

export const GET = handleRoute(async () =>
  ok(await getIslandView(await requireUserId())),
);
