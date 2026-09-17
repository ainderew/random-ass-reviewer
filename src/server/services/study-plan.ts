import type { StudyPlan } from '@/domain/types/study-plan';
import { db } from '@/server/db';
import { AppError } from '@/server/errors';
import { findUserById } from '@/server/repositories/user';
import {
  subjectProgress,
  recentQuizMistakes,
} from '@/server/repositories/study-plan';
export async function getStudyPlan(userId: string): Promise<StudyPlan> {
  const user = await findUserById(db, userId);
  if (!user) throw new AppError('NOT_FOUND', 'User not found');
  const [subjects, mistakes] = await Promise.all([
    subjectProgress(db, userId),
    recentQuizMistakes(db, userId),
  ]);
  return {
    examMonth: user.examMonth,
    dailyNewCards: user.dailyNewCards,
    subjects,
    mistakes,
  };
}
