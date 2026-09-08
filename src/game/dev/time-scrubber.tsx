'use client';

import { useState } from 'react';
import { worldState } from '@/game/systems/world-state';

// Development only. Sweeps the world clock so dusk can be tested at noon.
export const DevTimeScrubber = () => {
  const [hour, setHour] = useState<number | null>(null);
  const apply = (next: number | null) => {
    setHour(next);
    worldState.hourOverride = next;
  };
  return (
    <div className="absolute right-2 bottom-2 flex items-center gap-2 rounded-md bg-ground/80 px-2 py-1 font-mono text-xs text-muted">
      <label className="flex items-center gap-2">
        <span>{hour === null ? 'real time' : `${hour.toFixed(1)}h`}</span>
        <input
          type="range"
          min={0}
          max={24}
          step={0.1}
          value={hour ?? worldState.localHour}
          onChange={(e) => apply(Number(e.target.value))}
          aria-label="Time of day override"
        />
      </label>
      {hour !== null ? (
        <button type="button" onClick={() => apply(null)} className="underline">
          reset
        </button>
      ) : null}
    </div>
  );
};
