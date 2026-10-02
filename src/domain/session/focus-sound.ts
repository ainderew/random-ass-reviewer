// Background sound for a focus session: layers that can play together, each
// with its own volume. Silent unless chosen: silence is the best place to
// memorise, and no sound is proven to help everyone. Each layer says in a
// few words when it is worth choosing. The reasons and the studies behind
// them are on How it works.

export const SILENCE = { label: 'Silence', when: 'Best for memorizing' };

export const FOCUS_LAYERS = [
  { id: 'rain', label: 'Rain', short: 'Rain', when: 'Covers talk around you' },
  {
    id: 'brown',
    label: 'Brown noise',
    short: 'Noise',
    when: 'If your mind keeps wandering',
  },
  {
    id: 'piano',
    label: 'Soft piano',
    short: 'Piano',
    when: 'Calm music with no words',
  },
] as const;

export type FocusLayerId = (typeof FOCUS_LAYERS)[number]['id'];

// What is on, and each layer's volume from 0 to 1. A layer keeps its volume
// while off, so turning it back on sounds the way it did.
export interface FocusMix {
  on: FocusLayerId[];
  volume: Record<FocusLayerId, number>;
}

export const DEFAULT_LAYER_VOLUME = 0.6;

export const SILENT_MIX: FocusMix = {
  on: [],
  volume: {
    rain: DEFAULT_LAYER_VOLUME,
    brown: DEFAULT_LAYER_VOLUME,
    piano: DEFAULT_LAYER_VOLUME,
  },
};

const ORDER = FOCUS_LAYERS.map((layer) => layer.id);

export function isFocusLayer(value: unknown): value is FocusLayerId {
  return ORDER.some((id) => id === value);
}

export function focusLayer(id: FocusLayerId): (typeof FOCUS_LAYERS)[number] {
  return FOCUS_LAYERS.find((layer) => layer.id === id) ?? FOCUS_LAYERS[0];
}

function inOrder(ids: FocusLayerId[]): FocusLayerId[] {
  return ORDER.filter((id) => ids.includes(id));
}

// Read a stored mix, keeping only what is valid. Anything unreadable is
// silence, never an error.
export function parseMix(raw: string | null): FocusMix {
  let data: unknown = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    return SILENT_MIX;
  }
  if (typeof data !== 'object' || data === null) return SILENT_MIX;
  const { on, volume } = data as { on?: unknown; volume?: unknown };
  const stored = (typeof volume === 'object' && volume) || {};
  const level = (id: FocusLayerId) => {
    const v = (stored as Record<string, unknown>)[id];
    return typeof v === 'number' && v >= 0 && v <= 1 ? v : DEFAULT_LAYER_VOLUME;
  };
  return {
    on: inOrder(Array.isArray(on) ? on.filter(isFocusLayer) : []),
    volume: {
      rain: level('rain'),
      brown: level('brown'),
      piano: level('piano'),
    },
  };
}

export function toggleLayer(mix: FocusMix, id: FocusLayerId): FocusMix {
  const on = mix.on.includes(id)
    ? mix.on.filter((layer) => layer !== id)
    : inOrder([...mix.on, id]);
  return { ...mix, on };
}

export function silence(mix: FocusMix): FocusMix {
  return { ...mix, on: [] };
}

export function setLayerVolume(
  mix: FocusMix,
  id: FocusLayerId,
  volume: number,
): FocusMix {
  return {
    ...mix,
    volume: { ...mix.volume, [id]: Math.max(0, Math.min(1, volume)) },
  };
}

// For the button on the timer: "off", "Rain", or "Rain and Soft piano".
export function describeMix(mix: FocusMix): string {
  const names = mix.on.map((id) => focusLayer(id).label);
  if (names.length === 0) return 'off';
  if (names.length === 1) return names[0] ?? 'off';
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}
