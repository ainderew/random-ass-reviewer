'use client';

import { SpeakerIcon, SpeakerOffIcon } from '@/components/icons';
import { AudioSystem } from '@/game/systems/audio-system';
import { useAudioPreference } from '@/game/systems/use-audio-preference';

// Muted by default. The click is the gesture browsers need before any sound.
export const AudioToggle = () => {
  const [enabled, setEnabled] = useAudioPreference();
  return (
    <>
      <button
        type="button"
        onClick={() => setEnabled(!enabled)}
        aria-pressed={enabled}
        aria-label={enabled ? 'Mute ambient sound' : 'Unmute ambient sound'}
        className="absolute top-4 right-4 z-(--z-sticky) inline-flex size-11 items-center justify-center rounded-md bg-ground/85 text-ink-2 backdrop-blur-sm transition-colors duration-150 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus md:top-auto md:right-4 md:bottom-4"
      >
        {enabled ? <SpeakerIcon size={20} /> : <SpeakerOffIcon size={20} />}
      </button>
      <AudioSystem enabled={enabled} />
    </>
  );
};
