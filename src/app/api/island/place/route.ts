import { placeAssetRequestSchema } from '@/domain/types';
import { handleRoute, ok } from '@/lib/api-response';
import { requireUserId } from '@/server/require-user';
import { assertRateLimit } from '@/server/services/rate-limit';
import { placeAsset } from '@/server/services/island';

export const POST = handleRoute(async (req) => {
  const userId = await requireUserId();
  await assertRateLimit(userId, 'island:place');
  const body = placeAssetRequestSchema.parse(await req.json());
  return ok(await placeAsset({ ...body, userId }), 201);
});
