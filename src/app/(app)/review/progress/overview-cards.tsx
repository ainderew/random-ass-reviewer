import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { LearningProgress } from '@/domain/review/progress';
import type { ProgressOverview } from '@/domain/types';
import {
  CalendarIcon,
  ProgressIcon,
  RecoverIcon,
  ReviewIcon,
} from '@/components/icons';
import {
  cardsLabel,
  monthName,
  shortDate,
  StageBar,
  StageLegend,
  Tile,
} from './dashboard-parts';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

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

const percent = (s: { correct: number; total: number }) =>
  Math.round((100 * s.correct) / s.total);

export const SummaryTiles = ({
  overview,
  progress,
}: {
  overview: ProgressOverview;
  progress: LearningProgress;
}) => {
  const delayed = progress.delayedChoices;
  const studyDays = overview.week.days.filter((d) => d.active).length;
  const minutes = overview.week.focusMinutes;
  const focus =
    minutes >= 60
      ? `${Math.floor(minutes / 60)} h ${minutes % 60} m`
      : `${minutes} m`;
  return (
    <div className="dash-grid">
      <Tile
        icon={ReviewIcon}
        title="Solid"
        wide
        color="var(--color-focus)"
        value={overview.cards.solid}
        unit={`of ${overview.cards.total}`}
        caption="Remembered the last 3 times in a row, across a week or more"
        footer={
          <details className="stage-help">
            <summary>What do these mean?</summary>
            <dl>
              <dt>Solid</dt>
              <dd>
                You remembered it the last 3 times you reviewed it, and those 3
                reviews span at least a week. Three right answers in one evening
                do not count.
              </dd>
              <dt>Learning</dt>
              <dd>
                Reviewed, but not solid yet, including any card you got wrong
                recently. One Again sends a solid card back here.
              </dd>
              <dt>Not started</dt>
              <dd>Approved, but you have not reviewed it yet.</dd>
            </dl>
          </details>
        }
      >
        <StageBar stages={overview.cards} />
        <StageLegend stages={overview.cards} />
      </Tile>
      <Tile
        icon={ProgressIcon}
        title="After a week"
        color="var(--color-insight)"
        value={delayed.total ? `${percent(delayed)}%` : '–'}
        caption={
          delayed.total
            ? `${delayed.correct} of ${delayed.total} choices right on cards unseen for 7+ days`
            : 'Appears once a card has had a week between reviews'
        }
      >
        <div className="week-bars" aria-hidden="true">
          {progress.weeks.map((w) => (
            <span
              key={w.start}
              data-empty={!w.delayedChoices.total || undefined}
              style={{
                height: w.delayedChoices.total
                  ? `${Math.max(8, percent(w.delayedChoices))}%`
                  : undefined,
              }}
            />
          ))}
        </div>
      </Tile>
      <Tile
        icon={RecoverIcon}
        title="Mistakes fixed"
        color="var(--color-done)"
        value={overview.recovered}
        caption="Cards you missed once and remembered later"
      />
      <Tile
        icon={CalendarIcon}
        title="This week"
        wide
        color="#654377"
        value={studyDays}
        unit={studyDays === 1 ? 'study day' : 'study days'}
        caption={`${focus} focused · ${overview.week.reviews} reviews`}
      >
        <ol className="day-dots" aria-label="Study days this week">
          {overview.week.days.map((d, i, days) => (
            <li
              key={d.date}
              data-active={d.active || undefined}
              data-future={d.future || undefined}
              // Today is the last day that has already begun.
              data-today={
                (!d.future && (days[i + 1]?.future ?? true)) || undefined
              }
              aria-label={`${shortDate(d.date)}: ${d.future ? 'still to come' : d.active ? 'studied' : 'no study'}`}
            >
              <span aria-hidden="true">{DAY_LETTERS[i]}</span>
            </li>
          ))}
        </ol>
      </Tile>
    </div>
  );
};
