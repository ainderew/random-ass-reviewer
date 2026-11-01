'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import type { LearningProgress } from '@/domain/review/progress';
import type { ProgressOverview } from '@/domain/types';
import { ChevronLeftIcon } from '@/components/icons';
import { apiFetch } from '@/lib/api-client';
import { learningProgressKey, progressOverviewKey } from '@/lib/query-keys';
import { NextSteps } from './next-steps';
import { ExamCard } from './overview-cards';
import { GrowthSummary } from './growth-summary';
import styles from './progress.module.css';
import { tapFeedback } from '@/lib/tap-feedback';
import { SubjectProgress } from './subject-progress';
import { TrendChart } from './trend-chart';

// The visible summary stays compact; deeper measures are available on demand.
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
    <div
      className="mx-auto w-full max-w-2xl min-w-0 space-y-6"
      data-tap-feedback
      onClickCapture={tapFeedback}
    >
      <div className="space-y-1">
        <Link href="/review" className="session-back">
          <ChevronLeftIcon size={20} />
          Review
        </Link>
        <h1 className="font-display text-[clamp(2rem,6vw,2.5rem)] leading-tight font-extrabold tracking-[-0.02em] text-ink">
          Your progress
        </h1>
        <p className="text-ink-2">Small steps, adding up.</p>
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
          <GrowthSummary overview={overview.data} progress={progress.data} />
          <div>
            {overview.data.cards.total > 0 && (
              <details className={styles.disclosure}>
                <summary>Explore subjects</summary>
                <div>
                  <SubjectProgress
                    overview={overview.data}
                    progress={progress.data}
                  />
                  <NextSteps data={progress.data} />
                </div>
              </details>
            )}
            {progress.data.reviews > 0 && (
              <details className={styles.disclosure}>
                <summary>Accuracy & recall</summary>
                <div>
                  <TrendChart data={progress.data} />
                </div>
              </details>
            )}
            <details className={styles.disclosure}>
              <summary>Exam & study pace</summary>
              <div>
                <ExamCard overview={overview.data} />
              </div>
            </details>
          </div>
          <details className="border-t border-hairline pt-3">
            <summary className="min-h-11 cursor-pointer content-center font-medium">
              How progress is measured
            </summary>
            <div className="space-y-3 py-3 text-sm leading-relaxed text-ink-2">
              <p>
                Solid means you remembered a card the last three times in a row,
                with those reviews spread over a week or more. Remembered is any
                rating but Again, or the right multiple-choice pick. It counts
                what you did, not a prediction.
              </p>
              <p>
                Learning means reviewed but not yet solid. Not started means an
                approved card has not been reviewed. The weekly bars count
                completed reviews, including repeat practice.
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
