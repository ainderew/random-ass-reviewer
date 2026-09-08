import { heartbeatRequestSchema } from '@/domain/types';
import { handleRoute, ok } from '@/lib/api-response';
import { requireUserId } from '@/server/require-user';
import { recordHeartbeat } from '@/server/services/focus-session';

export const POST = handleRoute(async (req) => {
  const userId = await requireUserId();
  const body = heartbeatRequestSchema.parse(await req.json());
  return ok(await recordHeartbeat({ ...body, userId }));
});
