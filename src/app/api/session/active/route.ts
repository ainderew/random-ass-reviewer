import { handleRoute, ok } from '@/lib/api-response';
import { requireUserId } from '@/server/require-user';
import { getActiveSession } from '@/server/services/focus-session';

export const GET = handleRoute(async () =>
  ok(await getActiveSession(await requireUserId())),
);
