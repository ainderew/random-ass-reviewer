import { useState } from 'react';
import { BREAK_PROMPT_MS } from '@/domain/economy/constants';
import { Button } from '@/components/ui/button';
import { formatClock, formatMinutes } from '@/lib/format-time';
import { TimerFrame } from './timer-frame';

// Away is a fact, not a warning. The dot stops breathing, the digits cool
// down, the words say what is happening. Nothing dies.
export const RunningView = ({
  elapsedMs,
  focusedMs,
  isFocused,
  ending,
  error,
  breakReminderMs = BREAK_PROMPT_MS,
  onEnd,
}: {
  elapsedMs: number;
  focusedMs: number;
  isFocused: boolean;
  ending: boolean;
  breakReminderMs?: number;
  error: string | null;
  onEnd: () => void;
}) => {
  const [breakDismissed, setBreakDismissed] = useState(false);
  const showBreak = elapsedMs >= breakReminderMs && !breakDismissed;
  const breakMinutes = Math.round(breakReminderMs / 60_000);

  return (
    <TimerFrame
      label="Focus session"
      top={
        <p
          role="status"
          className={`flex items-center gap-2.5 text-[0.9375rem] transition-colors duration-200 ${
            isFocused ? 'text-ink-2' : 'text-muted'
          }`}
        >
          <span
            aria-hidden="true"
            className={`size-2.5 rounded-full transition-colors duration-200 ${
              isFocused ? 'dot-breathe bg-focus' : 'bg-muted'
            }`}
          />
          {isFocused ? 'Focused' : 'Away, not counting'}
        </p>
      }
      actions={
        <>
          {showBreak ? (
            <div className="flex items-center justify-between gap-4 rounded-lg border border-hairline bg-ground-2 px-4 py-3">
              <p className="text-[0.9375rem] leading-relaxed text-ink-2">
                {breakMinutes} minutes in. Five away helps the next{' '}
                {breakMinutes}.
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
          <Button
            variant="ghost"
            size="lg"
            block
            onClick={onEnd}
            disabled={ending}
            aria-busy={ending}
          >
            {ending ? 'Saving…' : 'End session'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p
          data-testid="elapsed"
          role="timer"
          aria-live="off"
          aria-label="Elapsed"
          className={`font-mono text-[clamp(4.5rem,24vw,7.5rem)] leading-none font-medium tracking-[-0.03em] tabular-nums transition-colors duration-300 ${
            isFocused ? 'text-ink' : 'text-ink-2'
          }`}
        >
          {formatClock(elapsedMs)}
        </p>
        <p className="text-lg text-muted">{formatMinutes(focusedMs)} focused</p>
      </div>
    </TimerFrame>
  );
};
