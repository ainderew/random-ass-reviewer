import { z } from 'zod';
import type { AnswerType } from '../review/regimen';
import type { ExamPace, StageCounts } from '../review/overview';
import type { MedtechSubject } from '../study/medtech';
import type { QuizContent } from '../study/quiz-content';
import type { Rating } from './study';

export interface QueuedCard {
  id: string;
  question: string;
  answer: string;
  sourceQuote: string;
  tags: string[];
  quiz?: QuizContent | null;
  answerType?: AnswerType;
  reviewCount?: number;
  relearning?: boolean;
  source?: { id: string; title: string };
  isNew: boolean;
  dueAt: Date;
  // Projected interval per rating, in days. Fractional under a day.
  intervals: Record<Rating, number>;
}

// What each subject has ready to review now, for the Review shelf.
export interface SubjectShelf {
  due: number;
  // Approved cards across the deck, including any without a subject.
  approved: number;
  subjects: Array<{ subject: MedtechSubject; due: number; approved: number }>;
}

// The progress dashboard: what is learned, how fast, and this week's work.
export interface ProgressOverview {
  // 'YYYY-MM-DD' in the student's own time zone.
  today: string;
  cards: StageCounts;
  subjects: Array<{ subject: MedtechSubject; stages: StageCounts }>;
  examMonth: string | null;
  exam: ExamPace | null;
  dailyNewLimit: number;
  // Cards missed or forgotten once and remembered later.
  recovered: number;
  week: {
    days: Array<{ date: string; active: boolean; future: boolean }>;
    focusMinutes: number;
    reviews: number;
  };
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
  attempts: Record<string, QuizProgress>;
}

// One answer at a time. The server grades and records the first attempt.
export const quizAnswerRequestSchema = z.object({
  sessionId: z.uuid(),
  cardId: z.uuid(),
  optionIndex: z.number().int().min(0).max(3),
});
export type QuizAnswerRequest = z.infer<typeof quizAnswerRequestSchema>;

export interface StoredQuizQuestion extends QuizQuestion {
  correctIndex: number;
  correctAnswer: string;
  explanation: string;
  optionExplanations: string[];
  sourceQuote: string;
}

export interface QuizProgress {
  cardId: string;
  correctAnswer: string;
  explanation: string;
  sourceQuote: string;
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
