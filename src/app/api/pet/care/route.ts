import { careRequestSchema } from '@/domain/types';
import { handleRoute, ok } from '@/lib/api-response';
import { requireUserId } from '@/server/require-user';
import { careForPet } from '@/server/services/pet';
import { assertRateLimit } from '@/server/services/rate-limit';

export const POST = handleRoute(async (req) => {
  const userId = await requireUserId();
  await assertRateLimit(userId, 'pet:care');
  const body = careRequestSchema.parse(await req.json());
  return ok(await careForPet(userId, body));
});
