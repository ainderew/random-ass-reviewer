import Link from 'next/link';
import { FocusSoundNotes } from './focus-sound-notes';
import {
  FOCUS_PER_MINUTE,
  INSIGHT_PER_REVIEW,
  INSIGHT_PER_QUIZ_CORRECT,
  MIN_SESSION_MS,
} from '@/domain/economy/constants';
import {
  MAX_QUIZ_MULTIPLIER,
  QUIZ_PASS_THRESHOLD,
} from '@/domain/review/constants';

// A product built on variable rewards should be able to explain itself
// without embarrassment. Every number here is the real constant.
export default function HowItWorksPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-2">
        <h1 className="font-serif text-4xl text-ink">How rewards work</h1>
        <p className="max-w-[52ch] leading-relaxed text-ink-2">
          Focus rewards timed sessions. Insight rewards completed reviews and
          correct quiz answers. Both help you build your island.
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="font-serif text-2xl text-ink">
          Why the daily plan looks like this
        </h2>
        <div className="space-y-4 text-sm leading-relaxed text-ink-2">
          <p>
            The aim is to remember facts later, correct errors, and apply
            knowledge to new questions. These are skills you need when taking an
            exam.
          </p>
          <ul className="list-disc space-y-3 pl-5">
            <li>
              <a
                className="text-focus underline"
                href="https://pubmed.ncbi.nlm.nih.gov/19930508/"
              >
                Recall practice · Larsen and colleagues, 2009
              </a>
              . In a randomized study with medical residents, repeated tests
              with feedback improved retention more than repeated study after
              more than six months.
            </li>
            <li>
              <a
                className="text-focus underline"
                href="https://pubmed.ncbi.nlm.nih.gov/19076480/"
              >
                Spaced review · Cepeda and colleagues, 2008
              </a>
              . Experiments showed that useful review gaps depend on how long
              information must be remembered.
            </li>
            <li>
              <a
                className="text-focus underline"
                href="https://pubmed.ncbi.nlm.nih.gov/18491500/"
              >
                Answer feedback · Butler and Roediger, 2008
              </a>
              . Feedback improved retention and reduced learning of incorrect
              multiple-choice options.
            </li>
            <li>
              <a
                className="text-focus underline"
                href="https://pubmed.ncbi.nlm.nih.gov/29265856/"
              >
                Different examples · Butler and colleagues, 2017
              </a>
              . Practising retrieval with different examples improved
              performance on new application questions.
            </li>
          </ul>
          <p>
            Aloft schedules cards using your recall ratings. Forgotten cards
            return sooner. New cards start with recall; relearning cards use
            writing; some later reviews use multiple choice when options exist.
            Your saved answer type takes priority.
          </p>
          <p>
            The methods have research support. The 15-minute default, weekly
            check-in, answer-type mix, and 7-day chart cutoff are practical
            choices, not proven ideal amounts. Adjust your time to fit your day.
          </p>
          <p>
            This exact program has not been tested on the Philippine Medtech
            board exam and cannot predict or guarantee a pass. Use it alongside
            your syllabus, reliable references, and board-style practice.
            Question-bank work outside Aloft is not tracked here.
          </p>
        </div>
      </section>
      <section className="space-y-2">
        <h2 className="font-serif text-2xl text-ink">Focus</h2>
        <p className="max-w-[52ch] leading-relaxed text-ink-2">
          A focus session earns {FOCUS_PER_MINUTE} Focus per minute from Start
          to End, whether Aloft is on screen or not, so reading your notes in a
          PDF app or a book counts too. While Aloft is open the screen stays on.
          The server counts the minutes from its own clock, so a changed system
          time earns nothing. One session counts up to two hours, so a timer
          left running overnight does not pay for the night. Sessions under{' '}
          {MIN_SESSION_MS / 60_000} minutes pay nothing. Time past your daily
          cap is not credited. That cap is eight hours and you can lower it in
          settings, never raise it.
        </p>
      </section>

      <FocusSoundNotes />

      <section className="space-y-2">
        <h2 className="font-serif text-2xl text-ink">Insight</h2>
        <p className="max-w-[52ch] leading-relaxed text-ink-2">
          Completing a due review pays {INSIGHT_PER_REVIEW} Insight once per
          card each day. Again earns the same as Good or Easy, so rate honestly.
          Relearning later that day still helps memory but earns no repeat
          credit. Each right answer on an approved practice quiz pays{' '}
          {INSIGHT_PER_QUIZ_CORRECT}. Delayed mistake checks are extra practice
          and do not earn repeat points.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-serif text-2xl text-ink">The quiz</h2>
        <p className="max-w-[52ch] leading-relaxed text-ink-2">
          After a focus session you can answer up to eight questions from your
          own notes. Score {Math.round(QUIZ_PASS_THRESHOLD * 100)}% or better
          and your Focus for that session is multiplied, up to ×
          {MAX_QUIZ_MULTIPLIER.toFixed(1)} for a perfect score. Below that, or
          if you skip, you keep exactly what you earned. The quiz can never take
          anything away.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-serif text-2xl text-ink">The chest</h2>
        <p className="max-w-[52ch] leading-relaxed text-ink-2">
          Every session over the minimum drops a cache. Its rarity is rolled
          from a seed fixed when the session starts, so nothing you do during
          the session changes it. Longer sessions roll better odds. After twelve
          sessions without a rare, the next one is guaranteed. Chests never
          contain anything you can buy with money, because nothing in Aloft can
          be bought with money.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-serif text-2xl text-ink">Streaks</h2>
        <p className="max-w-[52ch] leading-relaxed text-ink-2">
          A streak counts days with at least one paid session, in your own time
          zone. You start with two freezes; a missed day uses one instead of
          resetting. Streaks unlock small Insight bonuses. They never lock
          anything.
        </p>
      </section>

      <p className="text-sm text-muted">
        <Link
          href="/settings"
          className="text-focus underline underline-offset-4"
        >
          Back to settings
        </Link>
      </p>
    </article>
  );
}
