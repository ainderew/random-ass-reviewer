'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { SpeakerOffIcon } from '@/components/icons';
import { describeMix, focusLayer } from '@/domain/session/focus-sound';
import { useFocusSound, wakeFocusSound } from '../_hooks/use-focus-sound';
import { LAYER_ICONS, SoundSheet } from './sound-sheet';

// A small square beside the main button: the icons say what is playing, the
// tap opens the mix. Before a session the sheet plays the mix so it can be
// heard; during one every change is live.
export const SoundControl = ({ live }: { live: boolean }) => {
  const { mix, toggle, silence, setVolume, setAuditioning } = useFocusSound();
  const [open, setOpen] = useState(false);
  const count = mix.on.length;
  const first = mix.on[0];
  const label = !first
    ? 'Sound'
    : count === 1
      ? focusLayer(first).short
      : 'Mix';

  const show = (next: boolean) => {
    // Inside the tap, so the browser lets the sound start.
    if (next) wakeFocusSound(mix);
    setOpen(next);
  };

  // Before a session the open sheet plays the mix. Tied to the sheet's
  // lifetime, so leaving through the research link also stops it.
  useEffect(() => {
    if (live || !open) return;
    setAuditioning(true);
    return () => setAuditioning(false);
  }, [live, open, setAuditioning]);

  return (
    <>
      <button
        type="button"
        onClick={() => show(true)}
        aria-haspopup="dialog"
        aria-label={`Focus sound: ${describeMix(mix)}`}
        className={`inline-flex min-h-14 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border text-[0.6875rem] leading-none transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:scale-[0.98] ${
          count
            ? 'border-focus/50 bg-focus/10 text-focus-deep'
            : 'border-hairline text-ink-2 hover:bg-ground-2'
        }`}
      >
        <span aria-hidden="true" className="flex items-center gap-0.5">
          {count === 0 ? <SpeakerOffIcon size={22} /> : null}
          {mix.on.map((id) => {
            const Icon = LAYER_ICONS[id];
            return <Icon key={id} size={count === 1 ? 22 : 16} />;
          })}
        </span>
        <span aria-hidden="true">{label}</span>
      </button>
      {/* Portalled: the running timer's action row is sticky, and its
          stacking context would put the sheet under the tab bar. */}
      {open
        ? createPortal(
            <SoundSheet
              mix={mix}
              live={live}
              onToggle={toggle}
              onSilence={silence}
              onVolume={setVolume}
              onClose={() => show(false)}
            />,
            document.body,
          )
        : null}
    </>
  );
};
