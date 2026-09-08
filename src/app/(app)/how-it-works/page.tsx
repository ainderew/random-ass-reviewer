import Link from 'next/link';
import {
  FOCUS_PER_MINUTE,
  INSIGHT_PER_CORRECT,
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
          Aloft pays for two things: time you verifiably spend studying, and
          things you actually remember. Nothing pays for clicking.
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="font-serif text-2xl text-ink">Focus</h2>
        <p className="max-w-[52ch] leading-relaxed text-ink-2">
          While the timer runs and this tab is in front, you earn{' '}
          {FOCUS_PER_MINUTE} Focus per minute. The server counts the minutes
          from its own clock, so a changed system time or a background tab earns
          nothing. Sessions under {MIN_SESSION_MS / 60_000} minutes pay nothing.
          Time past your daily cap is not credited. That cap is eight hours and
          you can lower it in settings, never raise it.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-serif text-2xl text-ink">Insight</h2>
        <p className="max-w-[52ch] leading-relaxed text-ink-2">
          Reviewing a card you remembered pays {INSIGHT_PER_CORRECT} Insight, a
          little more for hard cards and for every fifth correct answer in a
          row. Forgetting pays nothing and costs nothing. Each right answer on
          the post-session quiz pays {INSIGHT_PER_QUIZ_CORRECT}. There is no
          other way to earn Insight, so the rarest island pieces can only be
          bought with recall.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-serif text-2xl text-ink">The quiz</h2>
        <p className="max-w-[52ch] leading-relaxed text-ink-2">
          After a session you can answer up to eight questions from your own
          notes. Score {Math.round(QUIZ_PASS_THRESHOLD * 100)}% or better and
          your Focus for that session is multiplied, up to ×
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
