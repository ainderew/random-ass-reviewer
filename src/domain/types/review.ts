import { z } from 'zod';
import type { Rating } from './study';

export interface QueuedCard {
  id: string;
  question: string;
  answer: string;
  sourceQuote: string;
  tags: string[];
  isNew: boolean;
  dueAt: Date;
  // Projected interval per rating, in days. Fractional under a day.
  intervals: Record<Rating, number>;
}

export interface AnswerResult {
  cardId: string;
  rating: Rating;
  nextDueAt: Date;
  intervalDays: number;
  insightAwarded: number;
  consecutiveCorrect: number;
  insightBalance: number;
}

// Sent to the client. Note what is absent: anything naming the right option.
export interface QuizQuestion {
  cardId: string;
  question: string;
  options: string[];
}

export interface QuizResult {
  multiplier: number;
  insightAwarded: number;
  correct: number;
  total: number;
}

export interface SessionQuiz {
  sessionId: string;
  questions: QuizQuestion[];
  // The quiz was already taken; the result screen shows what it earned.
  submitted: boolean;
}

// One answer at a time. The server grades and records the first attempt.
export const quizAnswerRequestSchema = z.object({
  sessionId: z.uuid(),
  cardId: z.uuid(),
  optionIndex: z.number().int().min(0).max(3),
});
export type QuizAnswerRequest = z.infer<typeof quizAnswerRequestSchema>;

export interface QuizProgress {
  correct: boolean;
  correctSoFar: number;
  answered: number;
  total: number;
  // What the session would earn if the quiz ended now.
  multiplier: number;
}

export const quizFinishRequestSchema = z.object({ sessionId: z.uuid() });

export interface ReviewForecastDay {
  // 0 = today, in the user's own day.
  dayOffset: number;
  count: number;
}

export interface ReviewStats {
  dueNow: number;
  // Earliest card not yet due. Null when nothing is scheduled.
  nextDueAt: Date | null;
  reviewedToday: number;
  // Proportion of reviews rated Good or Easy in the last 30 days. Null with no reviews.
  retention: number | null;
  forecast: ReviewForecastDay[];
  totals: { total: number; new: number; learning: number; mature: number };
}
