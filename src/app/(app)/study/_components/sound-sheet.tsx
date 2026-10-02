'use client';

import Link from 'next/link';
import { useEffect, useRef, type ComponentType } from 'react';
import {
  NoiseIcon,
  PianoIcon,
  RainIcon,
  SpeakerOffIcon,
} from '@/components/icons';
import {
  FOCUS_LAYERS,
  SILENCE,
  type FocusLayerId,
  type FocusMix,
} from '@/domain/session/focus-sound';
import { LayerSwitch } from './layer-switch';

export const LAYER_ICONS: Record<
  FocusLayerId,
  ComponentType<{ size?: number }>
> = { rain: RainIcon, brown: NoiseIcon, piano: PianoIcon };

// Turn on one sound or several; each has its own volume once it is on.
// Silence turns them all off. A sheet from the bottom, like her care sheet.
export const SoundSheet = ({
  mix,
  live,
  onToggle,
  onSilence,
  onVolume,
  onClose,
}: {
  mix: FocusMix;
  // A session is running: no link away from the timer.
  live: boolean;
  onToggle: (id: FocusLayerId) => void;
  onSilence: () => void;
  onVolume: (id: FocusLayerId, volume: number) => void;
  onClose: () => void;
}) => {
  const close = useRef<HTMLButtonElement>(null);
  const latestClose = useRef(onClose);
  useEffect(() => {
    latestClose.current = onClose;
  }, [onClose]);
  // Focus moves in on open and back to the opener on close; Escape closes.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') latestClose.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener?.focus();
    };
  }, []);
  const silent = mix.on.length === 0;

  return (
    <div
      className="fixed inset-0 z-(--z-modal) flex items-end justify-center bg-ink/30 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="focus-sound-title"
        className="max-h-[88dvh] w-full max-w-md space-y-3 overflow-y-auto rounded-t-3xl bg-ground px-5 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-left shadow-xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2
              id="focus-sound-title"
              className="font-serif text-xl font-black text-ink"
            >
              Focus sound
            </h2>
            <p className="text-sm text-ink-2">Mix one or more.</p>
          </div>
          <button
            ref={close}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-11 place-items-center rounded-xl text-2xl text-muted hover:bg-ground-3"
          >
            ×
          </button>
        </div>

        <button
          type="button"
          aria-pressed={silent}
          aria-label={SILENCE.label}
          aria-describedby="focus-sound-silence"
          onClick={onSilence}
          className={`flex min-h-14 w-full items-center gap-3 rounded-[14px] border px-3.5 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
            silent
              ? 'border-focus bg-focus/10'
              : 'border-hairline hover:bg-ground-2'
          }`}
        >
          <span className={silent ? 'text-focus-deep' : 'text-ink-2'}>
            <SpeakerOffIcon size={22} />
          </span>
          <span className="flex flex-col">
            <span className="font-semibold text-ink">{SILENCE.label}</span>
            <span id="focus-sound-silence" className="text-sm text-ink-2">
              {SILENCE.when}
            </span>
          </span>
        </button>

        <ul aria-label="Sounds" className="grid gap-2">
          {FOCUS_LAYERS.map((layer) => (
            <LayerSwitch
              key={layer.id}
              layer={layer}
              Icon={LAYER_ICONS[layer.id]}
              on={mix.on.includes(layer.id)}
              volume={mix.volume[layer.id]}
              onToggle={() => onToggle(layer.id)}
              onVolume={(volume) => onVolume(layer.id, volume)}
            />
          ))}
        </ul>

        {live ? null : (
          <Link
            href="/how-it-works#focus-sound"
            className="inline-flex min-h-11 items-center text-sm text-focus underline"
          >
            What the research says
          </Link>
        )}
      </div>
    </div>
  );
};
