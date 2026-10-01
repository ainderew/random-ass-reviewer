import { updatePetRequestSchema } from '@/domain/types';
import { handleRoute, ok } from '@/lib/api-response';
import { requireUserId } from '@/server/require-user';
import { assertRateLimit } from '@/server/services/rate-limit';
import { getPet, updatePet } from '@/server/services/pet';

export const GET = handleRoute(async () =>
  ok(await getPet(await requireUserId())),
);

export const PATCH = handleRoute(async (req) => {
  const userId = await requireUserId();
  await assertRateLimit(userId, 'pet:update');
  const body = updatePetRequestSchema.parse(await req.json());
  return ok(await updatePet(userId, body));
});
