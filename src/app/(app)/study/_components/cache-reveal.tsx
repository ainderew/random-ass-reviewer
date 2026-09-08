'use client';

import { useEffect, useRef, useState } from 'react';
import { ASSET_MANIFEST, isAssetId } from '@/domain/assets/manifest.generated';
import type { CacheOpenResponse, Rarity } from '@/domain/types';
import { BoltGlyph } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { SHAKE } from '@/game/systems/juice/constants';
import { playFanfare, playPitched } from '@/game/systems/juice/play-pitched';
import { useHitStop } from '@/game/systems/juice/use-hit-stop';
import { useScreenShake } from '@/game/systems/juice/use-screen-shake';
import { useAudioPreference } from '@/game/systems/use-audio-preference';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { useOpenCache } from '../_hooks/use-open-cache';
import { useCountUp } from '../_hooks/use-count-up';
import {
  useRevealTimeline,
  type RevealStage,
} from '../_hooks/use-reveal-timeline';
import { ChestIcon } from './chest-icon';
import { RarityBurst } from './rarity-burst';

// Rarity is never colour alone: the label always names it.
const RARITY_COLOR: Record<Rarity, string> = {
  common: '#a7adc0',
  uncommon: '#7d9b76',
  rare: '#6fd6c4',
  epic: '#e8b04b',
};
const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
};

const ORDER: RevealStage[] = [
  'closed',
  'wobble1',
  'wobble2',
  'wobble3',
  'hitstop',
  'burst',
  'glow',
  'item',
  'name',
  'done',
];
const reached = (stage: RevealStage, target: RevealStage) =>
  ORDER.indexOf(stage) >= ORDER.indexOf(target);

const Counter = ({ value }: { value: number }) => {
  const shown = useCountUp(value, 600);
  return <span className="tabular-nums">+{shown.toLocaleString()}</span>;
};

// The centrepiece. Contents are fetched while the chest wobbles and shown
// only when both the data and the timeline are ready. The glow resolves
// directly to the real rarity; there is no near-miss, ever.
export const CacheReveal = ({
  cacheId,
  onDone,
}: {
  cacheId: string;
  onDone: () => void;
}) => {
  const reducedMotion = useReducedMotion();
  const [audioOn] = useAudioPreference();
  const open = useOpenCache();
  const { frozen, freeze } = useHitStop();
  const { ref: shakeRef, shake } = useScreenShake();
  const [result, setResult] = useState<CacheOpenResponse | null>(null);
  const resultRef = useRef<CacheOpenResponse | null>(null);
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    open.mutate(cacheId, {
      onSuccess: (data) => {
        resultRef.current = data;
        setResult(data);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheId]);

  const { stage, skip } = useRevealTimeline({
    reducedMotion,
    onStage: (next) => {
      if (next === 'wobble1' && audioOn)
        playPitched({ frequency: 90, durationMs: 120 });
      if (next === 'wobble2' && audioOn)
        playPitched({ frequency: 90, semitones: 3, durationMs: 110 });
      if (next === 'wobble3' && audioOn)
        playPitched({ frequency: 90, semitones: 6, durationMs: 100 });
      if (next === 'hitstop') freeze();
      if (next === 'burst') {
        const rarity = resultRef.current?.rarity ?? 'common';
        shake(SHAKE[rarity]);
        if (audioOn) {
          if (rarity === 'epic') playFanfare();
          else
            playPitched({
              frequency: 330,
              semitones: { common: 0, uncommon: 4, rare: 7, epic: 12 }[rarity],
              durationMs: 260,
              type: 'triangle',
            });
        }
      }
    },
  });

  const rarity = result?.rarity ?? null;
  const color = rarity ? RARITY_COLOR[rarity] : '#a7adc0';
  const opened = reached(stage, 'burst');
  const showGlow = reached(stage, 'glow') && rarity !== null;
  const showItem = reached(stage, 'item') && result !== null;
  const showName = reached(stage, 'name') && result !== null;
  const done = stage === 'done';
  const wobble =
    stage === 'wobble1'
      ? 'wobble-1'
      : stage === 'wobble2'
        ? 'wobble-2'
        : stage === 'wobble3'
          ? 'wobble-3'
          : '';
  const won = result?.contents.assetIds[0];
  const wonLabel = won && isAssetId(won) ? ASSET_MANIFEST[won].label : null;

  if (open.isError) {
    return (
      <div className="space-y-3 rounded-lg border border-hairline p-4">
        <p className="text-ink-2">
          The chest is still yours. It just did not open this time.
        </p>
        <Button variant="ghost" onClick={() => open.mutate(cacheId)}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div ref={shakeRef} className={frozen ? 'paused' : ''}>
      <button
        type="button"
        onClick={done ? undefined : skip}
        aria-label={done ? 'Chest opened' : 'Skip the chest animation'}
        className="relative flex w-full flex-col items-center gap-3 rounded-lg py-6 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        {reached(stage, 'burst') && rarity ? (
          <RarityBurst rarity={rarity} color={color} />
        ) : null}
        <div
          className={`spring-pop relative ${wobble}`}
          style={
            showGlow ? { filter: `drop-shadow(0 0 22px ${color})` } : undefined
          }
        >
          <ChestIcon open={opened} glow={color} />
        </div>

        <div className="min-h-16 text-center">
          {showItem ? (
            <p className="spring-pop font-serif text-2xl text-ink">
              {wonLabel ?? 'A bundle of Focus'}
            </p>
          ) : null}
          {showName && rarity ? (
            <p className="spring-pop text-sm font-medium" style={{ color }}>
              {RARITY_LABEL[rarity]}
              {wonLabel ? ' piece, yours to place' : ' cache'}
            </p>
          ) : null}
          {!done && !reducedMotion ? (
            <p className="mt-2 text-xs text-muted">Tap to skip</p>
          ) : null}
        </div>
      </button>

      {done && result ? (
        <div className="flex flex-wrap items-center gap-5 text-lg">
          <span className="inline-flex items-center gap-1.5 text-focus">
            <BoltGlyph size={16} />
            <Counter value={result.contents.focus} /> Focus
          </span>
          {result.contents.insight > 0 ? (
            <span className="text-insight">
              <Counter value={result.contents.insight} /> Insight
            </span>
          ) : null}
          {result.alreadyOpened ? (
            <span className="text-sm text-muted">
              Already opened. Nothing paid twice.
            </span>
          ) : null}
        </div>
      ) : null}
      {done && !result && open.isPending ? (
        <p className="text-sm text-muted">Opening…</p>
      ) : null}
      <DoneSignal ready={done && result !== null} onDone={onDone} />
    </div>
  );
};

// Fires once when the reveal is truly finished, so what follows waits its turn.
const DoneSignal = ({
  ready,
  onDone,
}: {
  ready: boolean;
  onDone: () => void;
}) => {
  const fired = useRef(false);
  useEffect(() => {
    if (!ready || fired.current) return;
    fired.current = true;
    onDone();
  }, [ready, onDone]);
  return null;
};
