'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CheckIcon, ChevronRightIcon } from '@/components/icons';
import {
  milestoneInsight,
  STREAK_MILESTONES,
  type StreakSummary,
} from '@/domain/economy/streak';
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
  const [selected, setSelected] = useState<number | null>(null);
  const target = selected ?? streak.nextMilestone ?? 100;
  const reached = streak.days >= target;
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
              ? 'Today is complete'
              : `One ${streak.minimumMinutes}-minute session counts`}
          </small>
        </span>
        <ChevronRightIcon size={18} className={styles.chevron} />
      </summary>
      <div className={styles.body}>
        <div className={styles.goal}>
          <span
            className={styles.goalCheck}
            data-done={streak.todayDone || undefined}
          >
            {streak.todayDone ? <CheckIcon size={18} /> : <Flame />}
          </span>
          <span>
            <b>
              {streak.todayDone
                ? 'You showed up today'
                : 'A small goal for today'}
            </b>
            <small>
              {streak.todayDone
                ? 'Your next day starts tomorrow.'
                : `Finish a focus or reading session of ${streak.minimumMinutes}+ minutes.`}
            </small>
          </span>
        </div>
        <div className={styles.milestoneHeading}>
          <h3>Milestones for this streak</h3>
          <span>Tap to explore</span>
        </div>
        <div
          className={styles.path}
          role="group"
          aria-label="Streak milestones"
        >
          {STREAK_MILESTONES.map((n) => (
            <button
              type="button"
              key={n}
              aria-pressed={target === n}
              aria-label={`${n} days${streak.days >= n ? ', reached' : ''}, ${milestoneInsight(n)} Insight bonus`}
              data-earned={streak.days >= n || undefined}
              onClick={() => setSelected(n)}
            >
              <span>
                {streak.days >= n && <CheckIcon size={12} />}
                {n}
              </span>
            </button>
          ))}
        </div>
        <div className={styles.milestone} aria-live="polite">
          <p>
            <b>{target} days</b>
            <span>
              {reached
                ? 'Reached in this streak'
                : `${target - streak.days} more ${target - streak.days === 1 ? 'day' : 'days'}`}
            </span>
          </p>
          <progress
            max={target}
            value={Math.min(streak.days, target)}
            aria-label={`Progress to ${target} days`}
          />
          <small>
            {reached ? 'Milestone bonus' : 'Milestone reward'}:{' '}
            {milestoneInsight(target)} Insight
          </small>
        </div>
        <p className={styles.protection}>
          {streak.freezePending
            ? 'A rest day is covered when you return.'
            : `${streak.freezesRemaining} ${streak.freezesRemaining === 1 ? 'freeze' : 'freezes'} available this month.`}
        </p>
        <p className={styles.explain}>
          Two freezes refresh each month. One freeze bridges a single missed day
          automatically when you return. Reviews grow your learning progress;
          focus and reading sessions grow this streak.
        </p>
        {!streak.todayDone && (
          <Link href="/focus" className={styles.action}>
            Start focusing <ChevronRightIcon size={18} />
          </Link>
        )}
      </div>
    </details>
  );
}
