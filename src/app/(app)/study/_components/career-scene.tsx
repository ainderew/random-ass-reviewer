'use client';

import { sceneState, type CareerProgress } from '@/domain/career/milestones';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { CharacterView } from './character-view';

export type SceneMood = 'studying' | 'away' | 'resting';

const WALL = {
  bedroom: '#1b1f2c',
  clinic: '#1a2a2d',
  office: '#231f2c',
} as const;
const FLOOR = {
  bedroom: '#232838',
  clinic: '#233639',
  office: '#2c2636',
} as const;
const ROOM_LABEL = {
  bedroom: 'a bedroom desk',
  clinic: 'a clinic',
  office: 'her own office',
} as const;
const WEAR_LABEL = {
  hoodie: '',
  scrubs: 'scrubs on the shelf',
  coat: 'white coat on the hook',
} as const;

// The scene's own coordinates: 320 by 180, floor at 150. The character canvas
// sits over the desk in these units and the front layer draws the desk on top
// of it, so she is behind the desk from where we stand.
const FULL_VIEW = { x: 0, y: 0, w: 320, h: 180 };
const COMPACT_VIEW = { x: 0, y: 40, w: 320, h: 120 };
const CHARACTER_RECT = { x: 178, y: 42, w: 122, h: 110 };

const pct = (n: number) => `${n.toFixed(2)}%`;

// Her, at the desk, in the room she has earned so far. Every prop is switched
// by a milestone from real work. The room is two vector layers; she is a
// three.js character between them, drawn only once the model arrives.
export const CareerScene = ({
  progress,
  mood,
  compact = false,
}: {
  progress: CareerProgress;
  mood: SceneMood;
  compact?: boolean;
}) => {
  const s = sceneState(progress);
  const has = (id: string) => s.items.has(id);
  const reducedMotion = useReducedMotion();
  const view = compact ? COMPACT_VIEW : FULL_VIEW;
  const viewBox = `${view.x} ${view.y} ${view.w} ${view.h}`;
  const label = [
    `At ${ROOM_LABEL[s.room]}`,
    WEAR_LABEL[s.wardrobe],
    s.vehicle === 'none' ? '' : `${s.vehicle.replace('-', ' ')} outside`,
  ]
    .filter(Boolean)
    .join(', ');
  const moodLabel =
    mood === 'studying'
      ? 'Studying.'
      : mood === 'away'
        ? 'Looking up.'
        : 'Resting.';
  const lampOn = has('lamp');
  const characterStyle = {
    left: pct(((CHARACTER_RECT.x - view.x) / view.w) * 100),
    top: pct(((CHARACTER_RECT.y - view.y) / view.h) * 100),
    width: pct((CHARACTER_RECT.w / view.w) * 100),
    height: pct((CHARACTER_RECT.h / view.h) * 100),
  };

  return (
    <div
      className="relative overflow-hidden rounded-lg"
      role="img"
      aria-label={`${label}. ${moodLabel}`}
    >
      <svg viewBox={viewBox} className="block h-auto w-full" aria-hidden="true">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3b3f6b" />
            <stop offset="1" stopColor="#c07a4a" />
          </linearGradient>
          <radialGradient id="glow">
            <stop offset="0" stopColor="#e8b04b" stopOpacity="0.5" />
            <stop offset="1" stopColor="#e8b04b" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="320" height="180" fill={WALL[s.room]} />
        <rect y="150" width="320" height="30" fill={FLOOR[s.room]} />

        {/* Window with the sky and whatever is parked outside. */}
        <rect x="232" y="22" width="70" height="56" rx="3" fill="#2a2f45" />
        <rect x="236" y="26" width="62" height="48" rx="2" fill="url(#sky)" />
        <rect
          x="236"
          y="62"
          width="62"
          height="12"
          fill="#2a2f45"
          opacity="0.6"
        />
        {s.vehicle === 'bicycle' ? (
          <g stroke="#e9e5da" strokeWidth="1.5" fill="none">
            <circle cx="252" cy="66" r="5" />
            <circle cx="268" cy="66" r="5" />
            <path d="M252 66 L259 57 L266 66 M259 57 L262 57 M256 60 L261 66" />
          </g>
        ) : null}
        {s.vehicle === 'car' ? (
          <g>
            <rect x="246" y="60" width="32" height="10" rx="3" fill="#8b91a8" />
            <rect x="252" y="54" width="18" height="8" rx="3" fill="#8b91a8" />
            <circle cx="253" cy="70" r="3" fill="#14161f" />
            <circle cx="271" cy="70" r="3" fill="#14161f" />
          </g>
        ) : null}
        {s.vehicle === 'nicer-car' ? (
          <g>
            <path
              d="M244 70 L248 60 L262 56 L280 58 L288 64 L290 70 Z"
              fill="#e8b04b"
            />
            <rect x="252" y="58" width="16" height="5" rx="1" fill="#3b3f6b" />
            <circle cx="252" cy="71" r="3.2" fill="#14161f" />
            <circle cx="282" cy="71" r="3.2" fill="#14161f" />
          </g>
        ) : null}
        <line
          x1="267"
          y1="26"
          x2="267"
          y2="74"
          stroke="#2a2f45"
          strokeWidth="2"
        />

        {/* Bookshelf on the left. Shelves fill with cards remembered. */}
        <rect
          x="14"
          y="40"
          width="54"
          height="110"
          rx="2"
          fill="#2a2f45"
          stroke="#3a3f55"
          strokeWidth="1.5"
        />
        <rect x="18" y="72" width="46" height="2" fill="#1b1f2c" />
        <rect x="18" y="108" width="46" height="2" fill="#1b1f2c" />
        {s.shelves >= 1
          ? [0, 1, 2, 3, 4, 5].map((i) => (
              <rect
                key={`a${i}`}
                x={20 + i * 7.5}
                y={50 - (i % 2) * 2}
                width="6"
                height={22 + (i % 2) * 2}
                rx="1"
                fill={
                  i % 3 === 0 ? '#c9932f' : i % 3 === 1 ? '#6fd6c4' : '#a7adc0'
                }
              />
            ))
          : null}
        {s.shelves >= 2
          ? [0, 1, 2, 3, 4, 5].map((i) => (
              <rect
                key={`b${i}`}
                x={20 + i * 7.5}
                y={84 + (i % 2) * 2}
                width="6"
                height={22 - (i % 2) * 2}
                rx="1"
                fill={
                  i % 3 === 0 ? '#a7adc0' : i % 3 === 1 ? '#c9932f' : '#6fd6c4'
                }
              />
            ))
          : null}
        {s.wardrobe !== 'hoodie' ? (
          <g>
            <rect x="30" y="33" width="22" height="7" rx="1.5" fill="#4f9c8e" />
            <rect x="30" y="36" width="22" height="1" fill="#3d7a70" />
          </g>
        ) : null}
        {s.wardrobe === 'coat' ? (
          <g>
            <circle cx="311" cy="84" r="1.6" fill="#a7adc0" />
            <path
              d="M304 90 Q311 86 318 90 L319 126 L303 126 Z"
              fill="#e9e5da"
            />
            <path
              d="M308 90 L311 104 L314 90"
              fill="none"
              stroke="#a7adc0"
              strokeWidth="1.2"
            />
          </g>
        ) : null}

        {/* Wall items. */}
        {has('poster') ? (
          <g>
            <rect
              x="92"
              y="34"
              width="34"
              height="46"
              rx="1"
              fill="#e9e5da"
              opacity="0.9"
            />
            <circle
              cx="109"
              cy="44"
              r="4"
              fill="none"
              stroke="#c07a4a"
              strokeWidth="1.2"
            />
            <path
              d="M109 48 L109 66 M101 54 L117 54 M104 74 L109 66 L114 74"
              fill="none"
              stroke="#c07a4a"
              strokeWidth="1.2"
            />
          </g>
        ) : null}
        {has('diploma') ? (
          <g>
            <rect x="132" y="38" width="38" height="30" rx="1" fill="#c9932f" />
            <rect x="136" y="42" width="30" height="22" fill="#e9e5da" />
            <line
              x1="141"
              y1="50"
              x2="161"
              y2="50"
              stroke="#8b91a8"
              strokeWidth="1"
            />
            <line
              x1="141"
              y1="55"
              x2="157"
              y2="55"
              stroke="#8b91a8"
              strokeWidth="1"
            />
          </g>
        ) : null}
        {has('stethoscope') ? (
          <g fill="none" stroke="#a7adc0" strokeWidth="2">
            <circle cx="184" cy="40" r="1.8" fill="#a7adc0" />
            <path d="M179 44 C 174 60, 176 74, 182 82 M189 44 C 194 60, 192 74, 186 82 M182 82 C 184 88, 188 88, 190 82" />
            <circle cx="190" cy="92" r="4" fill="#232838" />
          </g>
        ) : null}
        {has('skeleton') ? (
          <g stroke="#e9e5da" strokeWidth="1.5" fill="none">
            <circle cx="84" cy="96" r="5" />
            <path d="M84 101 L84 126 M76 108 L92 108 M84 126 L78 148 M84 126 L90 148 M72 150 L96 150" />
          </g>
        ) : null}
        {s.room !== 'bedroom' && has('exam-table') ? (
          <g>
            <rect
              x="98"
              y="118"
              width="50"
              height="8"
              rx="2"
              fill="#6fd6c4"
              opacity="0.8"
            />
            <rect x="102" y="126" width="4" height="24" fill="#8b91a8" />
            <rect x="140" y="126" width="4" height="24" fill="#8b91a8" />
            <rect x="100" y="112" width="16" height="7" rx="3" fill="#e9e5da" />
          </g>
        ) : null}

        {lampOn ? <circle cx="176" cy="100" r="42" fill="url(#glow)" /> : null}
        <rect x="232" y="132" width="22" height="18" rx="1" fill="#2e3446" />
        <text
          x="8"
          y="174"
          fontSize="7"
          fill="#8b91a8"
          fontFamily="Geist Mono, monospace"
        >
          {ROOM_LABEL[s.room]}
        </text>
      </svg>

      <div className="absolute" style={characterStyle} aria-hidden="true">
        <CharacterView
          mood={mood}
          lampOn={lampOn}
          reducedMotion={reducedMotion}
        />
      </div>

      {/* Front layer: the desk and what sits on it, over her lap. */}
      <svg
        viewBox={viewBox}
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <rect x="150" y="128" width="100" height="6" rx="1" fill="#3a3f55" />
        <rect x="156" y="134" width="5" height="16" fill="#2e3446" />
        <rect x="239" y="134" width="5" height="16" fill="#2e3446" />
        <g>
          <rect x="165" y="122" width="3" height="8" fill="#8b91a8" />
          <path d="M166 122 L172 102" stroke="#8b91a8" strokeWidth="2" />
          <path
            d="M164 100 L182 100 L178 108 L168 108 Z"
            fill={lampOn ? '#e8b04b' : '#3a3f55'}
            className={
              lampOn && mood === 'studying' ? 'lantern-flame' : undefined
            }
          />
        </g>
        <rect x="188" y="121" width="28" height="7" rx="1" fill="#2e3446" />
        <rect x="192" y="112" width="20" height="9" rx="1" fill="#3b3f6b" />
        {has('notebook') ? (
          <rect x="220" y="123" width="14" height="5" rx="0.5" fill="#6fd6c4" />
        ) : null}
        {has('nameplate') ? (
          <g>
            <rect x="154" y="120" width="24" height="7" rx="1" fill="#c9932f" />
            <text
              x="166"
              y="125.5"
              textAnchor="middle"
              fontSize="5"
              fill="#14161f"
              fontFamily="Georgia, serif"
            >
              Dr.
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  );
};
