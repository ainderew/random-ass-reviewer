import { handleRoute, ok } from '@/lib/api-response';
import { requireUserId } from '@/server/require-user';
import { startSession } from '@/server/services/focus-session';

export const POST = handleRoute(async () =>
  ok(await startSession(await requireUserId())),
);
