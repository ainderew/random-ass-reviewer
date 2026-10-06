'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import type { LearningProgress } from '@/domain/review/progress';
import type { ProgressOverview } from '@/domain/types';
import { ChevronLeftIcon } from '@/components/icons';
import { apiFetch } from '@/lib/api-client';
import { learningProgressKey, progressOverviewKey } from '@/lib/query-keys';
import { NextSteps } from './next-steps';
import { ExamCard, SummaryTiles } from './overview-cards';
import { SubjectProgress } from './subject-progress';
import { TrendChart } from './trend-chart';

// A dashboard read top to bottom: the exam and the pace, four numbers that
// move with real learning, each subject, then the detail behind them.
export function ProgressView() {
  const progress = useQuery({
    queryKey: learningProgressKey,
    queryFn: () => apiFetch<LearningProgress>('/api/review/progress'),
  });
  const overview = useQuery({
    queryKey: progressOverviewKey,
    queryFn: () => apiFetch<ProgressOverview>('/api/review/overview'),
  });
  const failed = progress.isError || overview.isError;
  return (
    <div className="mx-auto w-full max-w-3xl min-w-0 space-y-6">
      <div className="space-y-1">
        <Link href="/review" className="session-back">
          <ChevronLeftIcon size={20} />
          Review
        </Link>
        <h1 className="font-display text-[clamp(2rem,6vw,2.5rem)] leading-tight font-extrabold tracking-[-0.02em] text-ink">
          Your progress
        </h1>
        <p className="text-ink-2">
          What is sticking, and what needs another try.
        </p>
      </div>
      {!progress.data || !overview.data ? (
        <p role={failed ? 'alert' : 'status'}>
          {failed ? (
            <>
              Your progress could not load.{' '}
              <button
                className="min-h-11 underline"
                onClick={() => {
                  void progress.refetch();
                  void overview.refetch();
                }}
              >
                Try again
              </button>
            </>
          ) : (
            'Loading your progress…'
          )}
        </p>
      ) : (
        <>
          <ExamCard overview={overview.data} />
          <SummaryTiles overview={overview.data} progress={progress.data} />
          <SubjectProgress overview={overview.data} progress={progress.data} />
          <NextSteps data={progress.data} />
          <TrendChart data={progress.data} />
          <details className="border-t border-hairline pt-3">
            <summary className="min-h-11 cursor-pointer content-center font-medium">
              What these measures can tell you
            </summary>
            <div className="space-y-3 py-3 text-sm leading-relaxed text-ink-2">
              <p>
                Solid means you remembered a card the last three times in a row,
                with those reviews spread over a week or more. Remembered is any
                rating but Again, or the right multiple-choice pick. It counts
                what you did, not a prediction.
              </p>
              <p>
                Delayed testing helps distinguish lasting learning from a good
                result immediately after studying. Seven days is our practical
                reporting window, not a research-established mastery threshold.{' '}
                <a
                  className="underline"
                  href="https://pubmed.ncbi.nlm.nih.gov/19930508/"
                >
                  Study on delayed retention
                </a>
              </p>
              <p>
                Practice on familiar cards is not the same as solving new exam
                questions. Use external mock exams to check transfer.{' '}
                <a
                  className="underline"
                  href="https://pubmed.ncbi.nlm.nih.gov/20804289/"
                >
                  Study on transfer
                </a>
              </p>
              <p>
                None of these numbers predicts a board-exam score. Scored
                results cover Review multiple choice; focus-session quizzes are
                separate. Deleting a card removes its review history. Written
                answers remain self-assessed.
              </p>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
