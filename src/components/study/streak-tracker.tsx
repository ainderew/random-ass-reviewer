'use client';

import Link from 'next/link';
import { ChevronRightIcon } from '@/components/icons';
import { milestoneInsight, type StreakSummary } from '@/domain/economy/streak';
import styles from './streak-tracker.module.css';

function Flame() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M13 2c1 5-4 5-3 9-2-1-3-3-3-3s-4 4-3 8a8 8 0 0 0 16-1c0-4-3-7-3-7 0 3-2 4-2 4 1-4 0-7-2-10Z" />
      <path d="M12 14c-3 3-3 6 0 6s3-3 0-6Z" />
    </svg>
  );
}

export function StreakTracker({ streak }: { streak: StreakSummary }) {
  const target = streak.nextMilestone;
  return (
    <details className={styles.tracker}>
      <summary className={styles.trigger}>
        <span
          className={styles.flame}
          data-done={streak.todayDone || undefined}
        >
          <Flame />
        </span>
        <span className={styles.title}>
          <strong>
            {streak.days
              ? `${streak.days}-day focus streak`
              : 'Start a focus streak'}
          </strong>
          <small>
            {streak.todayDone
              ? 'Done today'
              : `${streak.minimumMinutes} min to count today`}
          </small>
        </span>
        <ChevronRightIcon size={18} className={styles.chevron} />
      </summary>
      <div className={styles.body}>
        {target ? (
          <div className={styles.milestone}>
            <p>
              <b>Next: {target} days</b>
              <span>
                {streak.days}/{target}
              </span>
            </p>
            <progress
              max={target}
              value={streak.days}
              aria-label={`Progress to ${target} days`}
            />
            <small>+{milestoneInsight(target)} Insight for your island</small>
          </div>
        ) : (
          <p className={styles.protection}>All streak milestones reached.</p>
        )}
        <details className={styles.help}>
          <summary>How it works</summary>
          <p>
            One {streak.minimumMinutes}+ minute focus or reading session counts
            each day.
          </p>
          <p>
            Milestones give bonus Insight to spend on{' '}
            <Link href="/island">island items</Link>.
          </p>
          <p>
            {streak.freezesRemaining} freezes available. A freeze covers one
            missed day when you return. Two refresh monthly.
          </p>
          {streak.freezePending && (
            <p>Your missed day will be covered when you return.</p>
          )}
        </details>
        {!streak.todayDone && (
          <Link href="/focus" className={styles.action}>
            Start focusing <ChevronRightIcon size={18} />
          </Link>
        )}
      </div>
    </details>
  );
}
