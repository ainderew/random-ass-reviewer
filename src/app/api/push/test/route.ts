import { handleRoute, ok } from '@/lib/api-response';
import { requireUserId } from '@/server/require-user';
import { sendTestNudge } from '@/server/services/push';
import { assertRateLimit } from '@/server/services/rate-limit';

export const POST = handleRoute(async () => {
  const userId = await requireUserId();
  await assertRateLimit(userId, 'push:test');
  return ok(await sendTestNudge(userId));
});
