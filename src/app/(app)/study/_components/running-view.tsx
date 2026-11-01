import { useState } from 'react';
import { BREAK_PROMPT_MS } from '@/domain/economy/constants';
import type { CareerProgress } from '@/domain/career/milestones';
import type { PetView } from '@/domain/types';
import { currentRungNote, nextRung } from '@/domain/session/rungs';
import { bowlsFilled, minutesToNextBowl } from '@/domain/pet/care';
import { Button } from '@/components/ui/button';
import { formatClock, formatMinutes } from '@/lib/format-time';
import { useRungTone } from '../_hooks/use-rung-tone';
import { catLook } from './cat-look';
import { FocusCircle } from './focus-circle';
import { Lantern, lanternStage } from './lantern';
import { SoundControl } from './sound-control';
import { TimerFrame } from './timer-frame';

// Time counts from Start to End, in Aloft or out of it: reading the notes in
// another app is studying. Reaching the chosen length is a door, not a wall:
// save the session, or keep going.
export const RunningView = ({
  elapsedMs,
  focusedMs,
  lengthMs,
  career,
  ending,
  error,
  breakReminderMs = BREAK_PROMPT_MS,
  pet,
  onEnd,
}: {
  elapsedMs: number;
  focusedMs: number;
  lengthMs: number | null;
  career: CareerProgress;
  ending: boolean;
  error: string | null;
  breakReminderMs?: number;
  pet?: PetView | undefined;
  onEnd: () => void;
}) => {
  const [breakDismissed, setBreakDismissed] = useState(false);
  const [keptGoing, setKeptGoing] = useState(false);
  const reached = lengthMs !== null && focusedMs >= lengthMs && !keptGoing;
  const showBreak =
    lengthMs === null && elapsedMs >= breakReminderMs && !breakDismissed;
  const note = currentRungNote(focusedMs);
  const next = nextRung(focusedMs, lengthMs);
  // Points and kibble preview off the 1-second wall clock, not the 15-second
  // heartbeat, so the cat visibly fills while she focuses and nothing looks
  // frozen when she comes back from another app. The credited number at the
  // end is still the server's; this never shows less than it has confirmed.
  const liveMs = Math.max(focusedMs, elapsedMs);
  const sessionBowls = bowlsFilled(career.focusMs, liveMs);
  const toNextBowl = minutesToNextBowl(career.focusMs + liveMs);
  const catName = pet?.name ?? 'the cat';
  useRungTone(note, true);

  const statusLine = note
    ? note.label
    : next
      ? `Focused · ${next.label.toLowerCase()} at ${next.atMs / 60_000}`
      : 'Focused';

  return (
    <TimerFrame
      label="Focus session"
      top={
        <p
          role="status"
          className="flex items-center justify-center gap-3 text-[0.9375rem] text-ink-2"
        >
          <Lantern stage={lanternStage(focusedMs)} mode="focused" size={22} />
          {statusLine}
        </p>
      }
      actions={
        <>
          {reached ? (
            <div className="space-y-3 rounded-lg border border-focus/40 bg-ground-2 px-4 py-3">
              <p className="text-[0.9375rem] leading-relaxed text-ink">
                That is your {lengthMs / 60_000}. Save your session, or keep
                going.
              </p>
              <div className="flex gap-2">
                <Button onClick={onEnd} disabled={ending} aria-busy={ending}>
                  {ending ? 'Saving…' : 'End session'}
                </Button>
                <Button variant="ghost" onClick={() => setKeptGoing(true)}>
                  Keep going
                </Button>
              </div>
            </div>
          ) : null}
          {showBreak ? (
            <div className="flex items-center justify-between gap-4 rounded-lg border border-hairline bg-ground-2 px-4 py-3">
              <p className="text-[0.9375rem] leading-relaxed text-ink-2">
                {Math.round(breakReminderMs / 60_000)} minutes in. Five away
                helps the next {Math.round(breakReminderMs / 60_000)}.
              </p>
              <Button
                variant="ghost"
                onClick={() => setBreakDismissed(true)}
                className="shrink-0"
              >
                Keep going
              </Button>
            </div>
          ) : null}
          {error ? (
            <p
              role="status"
              className="text-[0.9375rem] leading-relaxed text-warn"
            >
              {error}
            </p>
          ) : null}
          {!reached ? (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="lg"
                onClick={onEnd}
                disabled={ending}
                aria-busy={ending}
                className="flex-1"
              >
                {ending ? 'Saving…' : 'End session'}
              </Button>
              <SoundControl live />
            </div>
          ) : null}
        </>
      }
    >
      <div className="flex flex-col items-center gap-5 text-center">
        <FocusCircle
          progress={career}
          mood="studying"
          focusedMs={focusedMs}
          lengthMs={lengthMs}
          {...(pet ? { name: pet.name, look: catLook(pet) } : {})}
        />
        <p
          className="flex items-center gap-2 rounded-full border border-hairline px-4 py-1.5 text-[0.9375rem] text-ink-2"
          aria-live="polite"
        >
          <span className="font-mono text-focus tabular-nums">
            +{sessionBowls}
          </span>
          <span className="text-muted">
            {sessionBowls === 1 ? 'bowl' : 'bowls'} for {catName} · next in{' '}
            {toNextBowl}m
          </span>
        </p>
        <div>
          <p
            data-testid="elapsed"
            role="timer"
            aria-live="off"
            aria-label="Elapsed"
            className="font-mono text-[clamp(3.25rem,16vw,5.25rem)] leading-none font-medium tracking-[-0.03em] text-ink tabular-nums"
          >
            {formatClock(elapsedMs)}
          </p>
          <p className="mt-2 text-[0.9375rem] text-muted">
            {formatMinutes(focusedMs)} focused
            {lengthMs !== null ? ` of ${lengthMs / 60_000}` : ''}
          </p>
        </div>
      </div>
    </TimerFrame>
  );
};
