'use client';

import Link from 'next/link';
import { useId, useRef, useState } from 'react';
import { NotesIcon, ReviewIcon, TimerIcon } from '@/components/icons';
import type { StudyBudget } from '@/domain/review/today';
import { actionFor, type AgendaStep } from '@/domain/study/agenda';

const SIZES: readonly { minutes: StudyBudget; cards: number }[] = [
  { minutes: 5, cards: 6 },
  { minutes: 15, cards: 18 },
  { minutes: 30, cards: 36 },
];

export const AgendaList = ({
  steps,
  size,
  onSize,
  focusing = false,
}: {
  steps: AgendaStep[];
  size: StudyBudget;
  onSize: (size: StudyBudget) => void;
  focusing?: boolean;
}) => {
  const [picking, setPicking] = useState(false);
  const pickerId = useId();
  const pickerTrigger = useRef<HTMLButtonElement>(null);
  return (
    <ol aria-label="Today's plan" className="grid gap-3">
      {steps.map((step) => {
        const primary = focusing ? step.id === 'focus' : step.state === 'now';
        const Icon =
          step.id === 'notes'
            ? NotesIcon
            : step.id === 'focus'
              ? TimerIcon
              : ReviewIcon;
        const label =
          focusing && step.id === 'focus'
            ? 'Back to your session'
            : step.state === 'done'
              ? step.title
              : actionFor(step)!.label;
        const detail =
          step.id === 'notes'
            ? 'Turn your notes into practice cards'
            : step.id === 'focus'
              ? focusing
                ? 'Your timer is running'
                : step.state === 'done'
                  ? step.detail
                  : `With ${step.title.replace('Focus with ', '')} · Choose a duration`
              : step.state === 'done'
                ? step.detail
                : `${step.detail} ready to practise`;
        return (
          <li key={step.id}>
            <Link
              href={step.href}
              aria-label={label}
              className={`flex min-h-20 items-center gap-3 rounded-xl px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus ${primary ? 'bg-focus text-white hover:bg-focus-deep' : 'border border-hairline bg-ground-2 text-ink hover:bg-ground-3'}`}
            >
              <Icon size={24} className="shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-base font-bold">{label}</span>
                <span
                  className={`mt-0.5 block text-sm leading-snug ${primary ? 'text-white' : 'text-ink-2'}`}
                >
                  {detail}
                </span>
                {step.state === 'done' && step.detail !== 'Nothing due' && (
                  <span className="mt-1 block text-xs font-semibold">
                    Completed today
                  </span>
                )}
              </span>
              <svg
                aria-hidden="true"
                className="shrink-0"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14m-5-5 5 5-5 5" />
              </svg>
            </Link>
            {step.id === 'review' && step.state !== 'done' && (
              <>
                <button
                  type="button"
                  ref={pickerTrigger}
                  aria-expanded={picking}
                  aria-controls={pickerId}
                  aria-label={`${step.detail}. Change how many`}
                  onClick={() => setPicking((value) => !value)}
                  className="mt-1 flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-ink-2 hover:bg-ground-3 focus-visible:outline-2 focus-visible:outline-focus"
                >
                  Change card count{' '}
                  <span aria-hidden="true">{picking ? '−' : '+'}</span>
                </button>
                {picking && (
                  <div
                    id={pickerId}
                    role="group"
                    aria-label="Review size"
                    className="grid grid-cols-3 gap-2 pb-1"
                  >
                    {SIZES.map((option) => (
                      <button
                        key={option.minutes}
                        type="button"
                        aria-pressed={size === option.minutes}
                        onClick={() => {
                          onSize(option.minutes);
                          setPicking(false);
                          pickerTrigger.current?.focus();
                        }}
                        className="min-h-11 rounded-lg border border-hairline bg-ground-2 px-2 text-sm text-ink aria-pressed:border-focus aria-pressed:bg-focus aria-pressed:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                      >
                        Up to {option.cards}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </li>
        );
      })}
    </ol>
  );
};
