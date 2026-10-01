import Link from 'next/link';
import { progressAdvice } from '@/domain/review/progress-advice';
import type { LearningProgress } from '@/domain/review/progress';

export function NextSteps({ data }: { data: LearningProgress }) {
  const subjects = progressAdvice(data);
  const focus = subjects.filter((s) => s.status === 'focus').slice(0, 2);
  const tracked = subjects.filter((s) => s.choices.total > 0).length;
  return (
    <section
      aria-labelledby="next-steps-heading"
      className="border-y border-hairline py-5"
    >
      <h2 id="next-steps-heading" className="text-2xl font-bold">
        What to work on next
      </h2>
      <p className="mt-2 text-sm text-ink-2">
        Based on your last 28 days of multiple-choice reviews.
      </p>
      {focus.length ? (
        <ul className="mt-4 space-y-5">
          {focus.map((s) => (
            <li key={s.id}>
              <h3 className="text-lg font-semibold">Revisit {s.label}</h3>
              <p className="mt-1 text-sm text-ink-2">
                {s.missed} of {s.choices.total} first choices were missed across{' '}
                {s.cards} distinct cards.
              </p>
              <p className="mt-2">
                Check the source for a missed idea. Explain it without looking,
                then retry when the card is due.
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4">
          {subjects.some((s) => s.status === 'extend')
            ? 'Your subjects with enough results have no recorded misses. Try unfamiliar questions from a trusted question bank to check whether you can apply the ideas.'
            : 'Complete reviews across a few different cards. There is not enough scored evidence yet to choose a subject to focus on.'}
        </p>
      )}
      <Link href="/review" className="journal-primary mt-5">
        Continue scheduled review
      </Link>
      <p className="mt-3 text-sm text-ink-2">
        {tracked} of 6 subjects have scored results. Untracked subjects are gaps
        in the data, not proof that you do not know them.
      </p>
      {data.subjects.some((s) => !s.subject) && (
        <p className="mt-2 text-sm text-ink-2">
          Some results have no subject. Label cards in Notes so future reviews
          count toward the right subject.
        </p>
      )}
    </section>
  );
}

export function SubjectDetails({ data }: { data: LearningProgress }) {
  const subjects = progressAdvice(data);
  return (
    <section aria-labelledby="subjects-heading">
      <h2 id="subjects-heading" className="text-xl font-bold">
        Your subjects, with next steps
      </h2>
      <p className="mt-2 text-sm text-ink-2">
        Subjects with missed answers and broader samples appear first.
      </p>
      <ul className="mt-4 divide-y divide-hairline">
        {subjects.map((s) => (
          <li key={s.id} className="py-5">
            <h3 className="font-semibold">{s.label}</h3>
            <p className="mt-1 text-sm text-ink-2">
              {s.choices.total
                ? `${Math.round((100 * s.choices.correct) / s.choices.total)}% correct · ${s.choices.correct}/${s.choices.total} reviews · ${s.cards} distinct cards`
                : 'No scored reviews in this period'}
            </p>
            <p className="mt-1 text-sm text-ink-2">
              After 7+ days:{' '}
              {s.delayed.total
                ? `${s.delayed.correct}/${s.delayed.total} correct`
                : 'no scored results yet'}
            </p>
            <p className="mt-3 font-medium">
              {s.status === 'focus'
                ? 'Next: revisit the ideas you missed.'
                : s.status === 'extend'
                  ? 'Next: try unfamiliar questions.'
                  : s.status === 'limited'
                    ? 'Next: practise a wider range of cards.'
                    : 'Next: add and review cards for this subject.'}
            </p>
            <p className="mt-1 text-sm text-ink-2">
              {s.status === 'focus'
                ? 'Check the explanation, recall it without notes, and keep the next scheduled review.'
                : s.status === 'extend'
                  ? 'Correct answers on familiar cards do not prove you can solve new exam questions.'
                  : s.status === 'limited'
                    ? 'This sample is too small or too narrow to rank the subject. Keep reviewing as cards become due.'
                    : 'Approve source-backed cards in Notes and set their subject. Multiple-choice results will appear here.'}
            </p>
          </li>
        ))}
      </ul>
      <Link
        href="/notes"
        className="inline-flex min-h-11 items-center text-focus underline"
      >
        Open notes and card sources
      </Link>
      <details className="mt-3">
        <summary className="min-h-11 cursor-pointer content-center text-sm font-medium">
          How suggestions are chosen
        </summary>
        <p className="py-3 text-sm text-ink-2">
          We need at least 5 scored reviews across 3 distinct cards before
          ranking a subject. Of those with misses, lower accuracy comes first.
          These are practical display rules, not board-exam cutoffs. Small
          samples, question difficulty, and repeated cards affect the results. A
          suggestion does not change your review schedule. Written and
          self-rated recall are shown separately in the chart.
        </p>
      </details>
    </section>
  );
}
