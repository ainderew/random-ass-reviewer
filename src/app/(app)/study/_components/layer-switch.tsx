import type { ComponentType } from 'react';
import type { FOCUS_LAYERS } from '@/domain/session/focus-sound';

// One sound in the mix: a switch for on and off, and its own volume while on.
// The slider sits outside the switch so the two are separate controls.
export const LayerSwitch = ({
  layer,
  Icon,
  on,
  volume,
  onToggle,
  onVolume,
}: {
  layer: (typeof FOCUS_LAYERS)[number];
  Icon: ComponentType<{ size?: number }>;
  on: boolean;
  volume: number;
  onToggle: () => void;
  onVolume: (volume: number) => void;
}) => (
  <li
    className={`rounded-[14px] border transition-colors duration-150 ${
      on ? 'border-focus bg-focus/10' : 'border-hairline'
    }`}
  >
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={layer.label}
      aria-describedby={`focus-sound-${layer.id}`}
      onClick={onToggle}
      className={`flex min-h-14 w-full items-center gap-3 rounded-[14px] px-3.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
        on ? '' : 'hover:bg-ground-2'
      }`}
    >
      <span className={on ? 'text-focus-deep' : 'text-ink-2'}>
        <Icon size={22} />
      </span>
      <span className="flex flex-1 flex-col">
        <span className="font-semibold text-ink">{layer.label}</span>
        <span id={`focus-sound-${layer.id}`} className="text-sm text-ink-2">
          {layer.when}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={`relative h-6 w-10 shrink-0 rounded-full transition-colors duration-150 ${
          on ? 'bg-focus' : 'bg-hairline'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-150 motion-reduce:transition-none ${
            on ? 'translate-x-4' : ''
          }`}
        />
      </span>
    </button>
    {on ? (
      <label className="flex items-center gap-3 px-3.5 pb-2 text-sm text-ink-2">
        <span aria-hidden="true">Volume</span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={Math.round(volume * 100)}
          onChange={(e) => onVolume(Number(e.target.value) / 100)}
          aria-label={`${layer.label} volume`}
          className="h-11 flex-1 accent-focus"
        />
      </label>
    ) : null}
  </li>
);
