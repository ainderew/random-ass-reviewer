import { endSessionRequestSchema } from '@/domain/types';
import { handleRoute, ok } from '@/lib/api-response';
import { requireUserId } from '@/server/require-user';
import { endSession } from '@/server/services/end-session';

export const POST = handleRoute(async (req) => {
  const userId = await requireUserId();
  const body = endSessionRequestSchema.parse(await req.json());
  return ok(await endSession({ ...body, userId }));
});
