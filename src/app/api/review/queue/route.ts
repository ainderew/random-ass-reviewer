import { subjectSchema } from '@/domain/study/medtech';
import { handleRoute, ok } from '@/lib/api-response';
import { requireUserId } from '@/server/require-user';
import { getReviewQueue } from '@/server/services/review';

// `?subject=` narrows the queue to one MTLE subject; without it, everything due.
export const GET = handleRoute(async (req) => {
  const subject = new URL(req.url).searchParams.get('subject');
  return ok(
    await getReviewQueue(
      await requireUserId(),
      subject ? subjectSchema.parse(subject) : undefined,
    ),
  );
});
