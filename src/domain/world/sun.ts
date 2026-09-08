import { lerpHex } from './color';

// Stylised, not astronomical. Golden hour gets a disproportionate share of
// the arc because it is the best light and a lot of studying happens then.
//   night 21-5 · dawn 5-7 · day 7-17 · golden 17-19 · dusk 19-21

export interface SunState {
  // Radians above the horizon. Negative at night.
  altitude: number;
  azimuth: number;
  // 0 full night, 1 full day.
  dayFactor: number;
}

const smooth = (t: number) => {
  const k = Math.max(0, Math.min(1, t));
  return k * k * (3 - 2 * k);
};

export function dayFactorForHour(localHour: number): number {
  const h = ((localHour % 24) + 24) % 24;
  if (h < 5 || h >= 21) return 0;
  if (h < 7) return smooth((h - 5) / 2);
  if (h < 17) return 1;
  if (h < 19) return 1 - 0.45 * smooth((h - 17) / 2);
  return 0.55 * (1 - smooth((h - 19) / 2));
}

export function sunPositionForLocalTime(input: {
  localHour: number;
}): SunState {
  const h = ((input.localHour % 24) + 24) % 24;
  const daylight = h >= 5 && h < 21;
  const altitude = daylight
    ? Math.sin((Math.PI * (h - 5)) / 16) * 1.2
    : -0.3 * Math.sin((Math.PI * ((h + 3) % 24)) / 8);
  const azimuth = (h / 24) * Math.PI * 2 - Math.PI / 2;
  return { altitude, azimuth, dayFactor: dayFactorForHour(h) };
}

export interface SkyPalette {
  topColor: string;
  horizonColor: string;
  sunColor: string;
  ambientColor: string;
  ambientIntensity: number;
  fogColor: string;
}

type Stop = {
  hour: number;
  top: string;
  horizon: string;
  sun: string;
  ambient: string;
  fog: string;
};

// Keyframes by hour. Linear RGB lerp between neighbours keeps every colour
// continuous across the whole day, including the 24 -> 0 wrap.
const STOPS: Stop[] = [
  {
    hour: 0,
    top: '#0b1020',
    horizon: '#1a2238',
    sun: '#a3b0dc',
    ambient: '#25304c',
    fog: '#14161f',
  },
  {
    hour: 5,
    top: '#141a34',
    horizon: '#3a3559',
    sun: '#9a8fb8',
    ambient: '#34384f',
    fog: '#1a1c2b',
  },
  {
    hour: 6,
    top: '#3b4a7a',
    horizon: '#e8a37c',
    sun: '#ffc48f',
    ambient: '#8e7f8a',
    fog: '#4a4257',
  },
  {
    hour: 7,
    top: '#5d90c8',
    horizon: '#dcc9ad',
    sun: '#ffe2b8',
    ambient: '#c2c4c8',
    fog: '#8d9ab0',
  },
  {
    hour: 12,
    top: '#6fa8dc',
    horizon: '#cfe3ee',
    sun: '#fff1d6',
    ambient: '#d5dde8',
    fog: '#a9bccc',
  },
  {
    hour: 17,
    top: '#7c86b0',
    horizon: '#f0b06c',
    sun: '#ffd08c',
    ambient: '#c7b6a6',
    fog: '#8f8492',
  },
  {
    hour: 18,
    top: '#5a5a92',
    horizon: '#f0a35a',
    sun: '#ffb35c',
    ambient: '#a89586',
    fog: '#6b5c6a',
  },
  {
    hour: 19,
    top: '#2b2f55',
    horizon: '#c9705e',
    sun: '#e89463',
    ambient: '#6a5a6c',
    fog: '#3f3548',
  },
  {
    hour: 20,
    top: '#161a36',
    horizon: '#5a3f5c',
    sun: '#9c7a8c',
    ambient: '#3e3a56',
    fog: '#232335',
  },
  {
    hour: 21,
    top: '#0f1428',
    horizon: '#232b45',
    sun: '#9ba8d4',
    ambient: '#2b3350',
    fog: '#181a27',
  },
  {
    hour: 24,
    top: '#0b1020',
    horizon: '#1a2238',
    sun: '#a3b0dc',
    ambient: '#25304c',
    fog: '#14161f',
  },
];

export function skyPaletteFor(
  dayFactor: number,
  localHour: number,
): SkyPalette {
  const h = ((localHour % 24) + 24) % 24;
  let i = 0;
  while (i < STOPS.length - 2 && STOPS[i + 1]!.hour <= h) i += 1;
  const a = STOPS[i]!;
  const b = STOPS[i + 1]!;
  const t = (h - a.hour) / (b.hour - a.hour);
  return {
    topColor: lerpHex(a.top, b.top, t),
    horizonColor: lerpHex(a.horizon, b.horizon, t),
    sunColor: lerpHex(a.sun, b.sun, t),
    ambientColor: lerpHex(a.ambient, b.ambient, t),
    // Night keeps a readable floor. This is a stylised world, not a photometer.
    ambientIntensity: 0.5 + 0.3 * dayFactor,
    fogColor: lerpHex(a.fog, b.fog, t),
  };
}
