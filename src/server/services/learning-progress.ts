import { learningProgress } from '@/domain/review/progress';
import { db } from '@/server/db';
import { progressReviews } from '@/server/repositories/learning-progress';
import { findUserById } from '@/server/repositories/user';
export async function getLearningProgress(userId: string) {
  const now = Date.now();
  const user = await findUserById(db, userId);
  // Fetch one extra day, then bucket exactly into the user's last 28 local days.
  const rows = await progressReviews(db, userId, new Date(now - 29 * 86400000));
  return learningProgress(rows, now, user?.timezone ?? 'UTC');
}
