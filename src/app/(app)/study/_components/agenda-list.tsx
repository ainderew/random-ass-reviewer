'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { StudyBudget } from '@/domain/review/today';
import type { AgendaStep } from '@/domain/study/agenda';

// Today's steps. Each row is a link to its step; the one to do now is
// outlined and pulses. The review row carries its size, in cards.
const SIZES: readonly { minutes: StudyBudget; cards: number }[] = [
  { minutes: 5, cards: 6 },
  { minutes: 15, cards: 18 },
  { minutes: 30, cards: 36 },
];

const STATE_LABEL = { done: 'done', now: 'next', later: '' } as const;

const Mark = ({ state }: { state: AgendaStep['state'] }) => (
  <span
    aria-hidden="true"
    className={`grid size-[22px] shrink-0 place-items-center rounded-full text-xs font-bold ${
      state === 'done'
        ? 'bg-done text-white'
        : state === 'now'
          ? 'agenda-pulse bg-focus'
          : 'shadow-[inset_0_0_0_2px_var(--color-hairline)]'
    }`}
  >
    {state === 'done' ? '✓' : null}
  </span>
);

export const AgendaList = ({
  steps,
  size,
  onSize,
}: {
  steps: AgendaStep[];
  size: StudyBudget;
  onSize: (size: StudyBudget) => void;
}) => {
  const [picking, setPicking] = useState(false);
  return (
    <ol aria-label="Today's plan" className="grid gap-2">
      {steps.map((step) => (
        <li key={step.id}>
          <div
            className={`flex min-h-[52px] items-center gap-3 rounded-[14px] pr-2 ${
              step.state === 'now'
                ? 'bg-ground-2 shadow-[inset_0_0_0_2px_var(--color-focus)]'
                : step.state === 'done'
                  ? ''
                  : 'bg-ground-2 shadow-[inset_0_0_0_1px_var(--color-hairline)]'
            }`}
          >
            <Link
              href={step.href}
              className="flex min-h-[52px] flex-1 items-center gap-3 rounded-[14px] pl-3.5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
            >
              <Mark state={step.state} />
              <span
                className={`font-medium ${step.state === 'done' ? 'text-muted line-through decoration-hairline' : 'text-ink'}`}
              >
                {step.title}
                {STATE_LABEL[step.state] ? (
                  <span className="sr-only">, {STATE_LABEL[step.state]}</span>
                ) : null}
              </span>
              {step.id === 'review' && step.state !== 'done' ? null : (
                <span className="ml-auto pr-1.5 text-[0.9375rem] text-ink-2 tabular-nums">
                  {step.detail}
                </span>
              )}
            </Link>
            {step.id === 'review' && step.state !== 'done' ? (
              <button
                type="button"
                aria-expanded={picking}
                aria-label={`${step.detail}. Change how many`}
                onClick={() => setPicking((p) => !p)}
                className="min-h-9 shrink-0 rounded-full bg-ground-3 px-3 text-sm text-ink-2 tabular-nums"
              >
                {step.detail} ▾
              </button>
            ) : null}
          </div>
          {step.id === 'review' && picking ? (
            <div
              role="group"
              aria-label="Review size"
              className="flex gap-1.5 pt-2 pl-10"
            >
              {SIZES.map((s) => (
                <button
                  key={s.minutes}
                  type="button"
                  aria-pressed={size === s.minutes}
                  onClick={() => {
                    onSize(s.minutes);
                    setPicking(false);
                  }}
                  className="min-h-9 rounded-full border border-hairline bg-ground-2 px-3 text-sm aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-ground-2"
                >
                  Up to {s.cards}
                </button>
              ))}
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  );
};
