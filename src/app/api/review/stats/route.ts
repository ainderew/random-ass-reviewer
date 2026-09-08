import { handleRoute, ok } from '@/lib/api-response';
import { requireUserId } from '@/server/require-user';
import { getReviewStats } from '@/server/services/review-stats';

export const GET = handleRoute(async () =>
  ok(await getReviewStats(await requireUserId())),
);
