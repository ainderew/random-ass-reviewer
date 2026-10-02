import { useState } from 'react';
import { BREAK_PROMPT_MS } from '@/domain/economy/constants';
import type { CareerProgress } from '@/domain/career/milestones';
import type { Aim } from '@/domain/island/aim';
import type { PetView } from '@/domain/types';
import {
  currentRungNote,
  earningsSoFar,
  nextRung,
} from '@/domain/session/rungs';
import { BoltGlyph } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { formatClock, formatMinutes } from '@/lib/format-time';
import { useRungTone } from '../_hooks/use-rung-tone';
import { AimLine } from './aim-line';
import { catLook } from './cat-look';
import { FocusCircle } from './focus-circle';
import { Lantern, lanternStage } from './lantern';
import { SoundControl } from './sound-control';
import { TimerFrame } from './timer-frame';

// Time counts from Start to End, in Aloft or out of it: reading the notes in
// another app is studying. Reaching the chosen length is a door, not a wall:
// end and collect, or keep going.
export const RunningView = ({
  elapsedMs,
  focusedMs,
  lengthMs,
  aim,
  career,
  focusBalance,
  level,
  ending,
  error,
  breakReminderMs = BREAK_PROMPT_MS,
  pet,
  onEnd,
}: {
  elapsedMs: number;
  focusedMs: number;
  lengthMs: number | null;
  aim: Aim | null;
  career: CareerProgress;
  focusBalance: number;
  level: number;
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
  const earned = earningsSoFar(focusedMs);
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
                That is your {lengthMs / 60_000}. Collect what it earned, or
                keep going.
              </p>
              <div className="flex gap-2">
                <Button onClick={onEnd} disabled={ending} aria-busy={ending}>
                  {ending ? 'Saving…' : 'End and collect'}
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
          <span className="inline-flex items-center gap-1 font-mono text-focus tabular-nums">
            <BoltGlyph size={14} />
            {earned}
          </span>
          <span className="text-muted">so far</span>
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
        <AimLine
          aim={aim}
          focusBalance={focusBalance + earned}
          level={level}
          compact
        />
      </div>
    </TimerFrame>
  );
};
