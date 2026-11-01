import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { ProgressOverview } from '@/domain/types';
import { CalendarIcon } from '@/components/icons';
import { cardsLabel, monthName, shortDate } from './dashboard-parts';

function paceLine(o: ProgressOverview) {
  const { cards, exam, examMonth, dailyNewLimit, today } = o;
  const settings = (
    <Link href="/settings" className="dash-link">
      Change it in Settings
    </Link>
  );
  if (cards.total === 0)
    return (
      <>
        Approve cards in Notes and they will show up here.{' '}
        <Link href="/notes" className="dash-link">
          Open Notes
        </Link>
      </>
    );
  if (!examMonth)
    return (
      <>
        Set your exam month to see the pace that covers all your notes.{' '}
        <Link href="/settings" className="dash-link">
          Set it in Settings
        </Link>
      </>
    );
  if (!exam) return 'Your exam month is here. Keep up with what is due.';
  if (!exam.startedAllBy)
    return 'Every card is underway. Keeping up with what is due is the whole job now.';
  if (exam.onPace)
    return exam.startedAllBy === today
      ? `At ${dailyNewLimit} new cards a day, you will have started all ${cards.new} today.`
      : `At ${dailyNewLimit} new cards a day, you will have started all ${cards.new} by ${shortDate(exam.startedAllBy)}.`;
  return (
    <>
      To start all {cards.new} before {monthName(examMonth)}, take about{' '}
      {exam.neededPerDay} new cards a day. Your limit is {dailyNewLimit}.{' '}
      {settings}
    </>
  );
}

// The exam countdown, how much of the notes is underway, and the pace.
export const ExamCard = ({ overview }: { overview: ProgressOverview }) => {
  const { cards, exam, examMonth } = overview;
  const started = cards.total - cards.new;
  return (
    <section
      className="dash-hero"
      aria-labelledby="exam-heading"
      style={{ '--tile': 'var(--color-focus)' } as CSSProperties}
    >
      <div className="flex items-baseline gap-3">
        <h2 id="exam-heading" className="dash-tile-head">
          <CalendarIcon size={18} />
          {examMonth ? 'Board exam' : 'Your notes'}
        </h2>
        {examMonth && (
          <span className="ml-auto text-sm text-ink-2">
            {monthName(examMonth)}
          </span>
        )}
      </div>
      <p className="dash-value dash-value-hero">
        {exam ? exam.daysLeft : started}
        <small>
          {exam ? 'days to go' : `of ${cardsLabel(cards.total)} started`}
        </small>
      </p>
      {exam && (
        <div className="space-y-2">
          <div
            className="started-bar"
            role="img"
            aria-label={`${started} of ${cards.total} cards started`}
          >
            <span
              style={{
                width: `${cards.total ? (100 * started) / cards.total : 0}%`,
              }}
            />
          </div>
          <p className="text-sm text-ink-2">
            <b className="text-ink">{started}</b> of {cardsLabel(cards.total)}{' '}
            started
          </p>
        </div>
      )}
      <p className="dash-note">{paceLine(overview)}</p>
    </section>
  );
};
