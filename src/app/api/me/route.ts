import { updateProfileRequestSchema } from '@/domain/types';
import { handleRoute, ok } from '@/lib/api-response';
import { requireUserId } from '@/server/require-user';
import { getProfile, updateProfile } from '@/server/services/user-settings';

export const GET = handleRoute(async () =>
  ok(await getProfile(await requireUserId())),
);

export const PATCH = handleRoute(async (req) => {
  const userId = await requireUserId();
  const body = updateProfileRequestSchema.parse(await req.json());
  return ok(await updateProfile(userId, body));
});
