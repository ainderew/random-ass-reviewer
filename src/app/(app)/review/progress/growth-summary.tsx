import Link from 'next/link';
import type { LearningProgress } from '@/domain/review/progress';
import type { ProgressOverview } from '@/domain/types';
import { ChevronRightIcon, NotesIcon } from '@/components/icons';
import { shortDate, StageBar } from './dashboard-parts';
import styles from './progress.module.css';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const number = (n: number) => n.toLocaleString('en-US');

export function GrowthSummary({
  overview,
  progress,
}: {
  overview: ProgressOverview;
  progress: LearningProgress;
}) {
  const { cards, week } = overview;
  const active = week.days.filter((d) => d.active).length;
  const max = Math.max(1, ...progress.weeks.map((w) => w.reviews));
  return (
    <div className={styles.summary}>
      <section aria-labelledby="rhythm-title" className={styles.rhythm}>
        <div className={styles.heading}>
          <h2 id="rhythm-title">This week</h2>
          <span>{active} of 7 study days</span>
        </div>
        <ol className={styles.days} aria-label="Study days this week">
          {week.days.map((day, i) => (
            <li
              key={day.date}
              data-active={day.active || undefined}
              data-future={day.future || undefined}
              data-today={day.date === overview.today || undefined}
              aria-label={`${shortDate(day.date)}: ${day.active ? 'studied' : day.future ? 'upcoming' : 'no study'}${day.date === overview.today ? ', today' : ''}`}
            >
              <span className={styles.dayMark} aria-hidden="true">
                {day.active ? (
                  <svg viewBox="0 0 24 24">
                    <path d="m6 12 4 4 8-8" />
                  </svg>
                ) : (
                  <span />
                )}
              </span>
              <span aria-hidden="true">{DAYS[i]}</span>
            </li>
          ))}
        </ol>
        <p className={styles.caption}>
          {number(week.focusMinutes)} min focused{' '}
          <span aria-hidden="true">·</span> {number(week.reviews)} reviews
        </p>
      </section>
      {progress.reviews > 0 && (
        <section className={styles.practice} aria-labelledby="practice-title">
          <div className={styles.heading}>
            <h2 id="practice-title">Practice over time</h2>
            <span>Last 4 weeks</span>
          </div>
          <div
            className={styles.bars}
            role="img"
            aria-label={progress.weeks
              .map(
                (w) =>
                  `${shortDate(w.start)} to ${shortDate(w.end)}: ${w.reviews} reviews`,
              )
              .join('; ')}
          >
            {progress.weeks.map((w, i) => (
              <div className={styles.column} key={w.start} aria-hidden="true">
                <div className={styles.barTrack}>
                  <div
                    className={styles.bar}
                    data-current={i === progress.weeks.length - 1 || undefined}
                    style={{ height: `${(100 * w.reviews) / max}%` }}
                  >
                    <b>{number(w.reviews)}</b>
                  </div>
                </div>
                <span>{shortDate(w.start)}</span>
              </div>
            ))}
          </div>
          <p className={styles.caption}>Reviews per 7-day period</p>
        </section>
      )}
      {cards.total > 0 ? (
        <section className={styles.memory} aria-labelledby="memory-title">
          <div className={styles.heading}>
            <h2 id="memory-title">Your cards</h2>
            <span>{number(cards.total)} total</span>
          </div>
          <StageBar stages={cards} />
          <ul className={styles.legend}>
            <li>
              <i data-stage="solid" />
              <b>{number(cards.solid)}</b>
              <span>Solid</span>
            </li>
            <li>
              <i data-stage="learning" />
              <b>{number(cards.learning)}</b>
              <span>Learning</span>
            </li>
            <li>
              <i data-stage="new" />
              <b>{number(cards.new)}</b>
              <span>Not started</span>
            </li>
          </ul>
          {overview.recovered > 0 && (
            <p className={styles.caption}>
              {number(overview.recovered)} previously missed cards remembered
              again
            </p>
          )}
          {progress.reviews === 0 && (
            <Link className={styles.action} href="/review">
              Start your first review <ChevronRightIcon size={18} />
            </Link>
          )}
        </section>
      ) : (
        <section className={styles.empty} aria-labelledby="start-title">
          <NotesIcon size={32} />
          <h2 id="start-title">Room to grow</h2>
          <p>
            Add your notes, then approve a few cards. Watch your progress take
            shape as you review.
          </p>
          <Link href="/notes" className={styles.action}>
            Add notes <ChevronRightIcon size={18} />
          </Link>
        </section>
      )}
    </div>
  );
}
