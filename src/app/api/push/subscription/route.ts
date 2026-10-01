import { pushSubscriptionSchema, pushUnsubscribeSchema } from '@/domain/types';
import { handleRoute, ok } from '@/lib/api-response';
import { requireUserId } from '@/server/require-user';
import {
  getPushStatus,
  subscribeToNudges,
  unsubscribeFromNudges,
} from '@/server/services/push';
import { assertRateLimit } from '@/server/services/rate-limit';

export const GET = handleRoute(async () =>
  ok(await getPushStatus(await requireUserId())),
);

export const POST = handleRoute(async (req) => {
  const userId = await requireUserId();
  await assertRateLimit(userId, 'push:subscribe');
  const body = pushSubscriptionSchema.parse(await req.json());
  return ok(await subscribeToNudges(userId, body), 201);
});

export const DELETE = handleRoute(async (req) => {
  const userId = await requireUserId();
  const body = pushUnsubscribeSchema.parse(await req.json());
  return ok(await unsubscribeFromNudges(userId, body.endpoint));
});
