import { handleRoute, ok } from '@/lib/api-response';
import { requireUserId } from '@/server/require-user';
import { getReviewQueue } from '@/server/services/review';

export const GET = handleRoute(async () =>
  ok(await getReviewQueue(await requireUserId())),
);
