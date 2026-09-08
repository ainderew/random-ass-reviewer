import { setApiKeyRequestSchema } from '@/domain/types';
import { handleRoute, ok } from '@/lib/api-response';
import { requireUserId } from '@/server/require-user';
import { assertRateLimit } from '@/server/services/rate-limit';
import {
  clearApiKey,
  getApiKeyStatus,
  setApiKey,
} from '@/server/services/settings';

// Masked on GET, always. The plaintext is decrypted only inside the provider.
export const GET = handleRoute(async () =>
  ok(await getApiKeyStatus(await requireUserId())),
);

export const PUT = handleRoute(async (req) => {
  const userId = await requireUserId();
  await assertRateLimit(userId, 'settings:api-key');
  const body = setApiKeyRequestSchema.parse(await req.json());
  return ok(await setApiKey(userId, body.apiKey));
});

export const DELETE = handleRoute(async () => {
  await clearApiKey(await requireUserId());
  return ok({ configured: false, masked: null });
});
