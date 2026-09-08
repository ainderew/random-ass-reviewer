'use client';

import Link from 'next/link';
import { useState } from 'react';
import { aimCandidates, minutesToAfford, type Aim } from '@/domain/island/aim';
import { BoltGlyph } from '@/components/icons';

// Study toward a piece of the island. The line counts down in minutes; when
// it lands it says so once and points at the island. No confetti: the reward
// stays where it belongs.
export const AimLine = ({
  aim,
  focusBalance,
  level,
  onChange,
  compact = false,
}: {
  aim: Aim | null;
  focusBalance: number;
  level: number;
  onChange?: (assetId: string) => void;
  compact?: boolean;
}) => {
  const [picking, setPicking] = useState(false);
  if (!aim) return null;
  const minutes = minutesToAfford(aim.priceFocus, focusBalance);
  const reached = minutes === 0;

  const line = reached ? (
    <span>
      <b className="font-medium text-ink">{aim.label}</b> is yours to place.{' '}
      {!compact ? (
        <Link
          href="/island"
          className="text-focus underline underline-offset-4"
        >
          Go build
        </Link>
      ) : null}
    </span>
  ) : (
    <span>
      Saving for <b className="font-medium text-ink">{aim.label}</b>
      <span className="text-muted"> · </span>
      <span className="inline-flex items-center gap-1 font-mono text-focus tabular-nums">
        <BoltGlyph size={13} />
        {aim.priceFocus}
      </span>
      <span className="text-muted"> · </span>
      <span className="font-mono tabular-nums">{minutes} min</span> away
    </span>
  );

  return (
    <div className="space-y-2 text-[0.9375rem] leading-relaxed text-ink-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="m-0">{line}</p>
        {onChange && !picking ? (
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="min-h-11 text-sm text-muted underline underline-offset-4 hover:text-ink"
          >
            Change
          </button>
        ) : null}
      </div>
      {picking && onChange ? (
        <div
          role="radiogroup"
          aria-label="Piece to save for"
          className="flex flex-wrap gap-2"
        >
          {aimCandidates(level).map((candidate) => {
            const on = candidate.assetId === aim.assetId;
            const away = minutesToAfford(candidate.priceFocus, focusBalance);
            return (
              <button
                key={candidate.assetId}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  onChange(candidate.assetId);
                  setPicking(false);
                }}
                className={`min-h-11 rounded-full border px-3 text-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                  on
                    ? 'border-focus text-ink'
                    : 'border-hairline text-ink-2 hover:text-ink'
                }`}
              >
                {candidate.label}
                <span className="ml-1.5 font-mono text-xs text-muted tabular-nums">
                  {away === 0 ? 'ready' : `${away} min`}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};
