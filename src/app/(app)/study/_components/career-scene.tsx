import { sceneState, type CareerProgress } from '@/domain/career/milestones';

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
const WARDROBE = {
  hoodie: '#6b5ea8',
  scrubs: '#4f9c8e',
  coat: '#e9e5da',
} as const;
const ROOM_LABEL = {
  bedroom: 'a bedroom desk',
  clinic: 'a clinic',
  office: 'her own office',
} as const;
const WEAR_LABEL = {
  hoodie: 'in a hoodie',
  scrubs: 'in scrubs',
  coat: 'in a white coat',
} as const;

// Her, at the desk, in the room she has earned so far. Every layer here is
// switched by a milestone from real work. She studies while the session
// runs, looks up when the tab is away, and leans back on a break. No face,
// no mascot: a person at work, drawn small and warm.
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
  const label = `${WEAR_LABEL[s.wardrobe]}, at ${ROOM_LABEL[s.room]}${
    s.vehicle === 'none' ? '' : `, ${s.vehicle.replace('-', ' ')} outside`
  }. ${mood === 'studying' ? 'Studying.' : mood === 'away' ? 'Looking up.' : 'Resting.'}`;
  const headY = mood === 'studying' ? 96 : mood === 'away' ? 90 : 92;
  const headX = mood === 'away' ? 214 : 206;
  const lampOn = has('lamp');

  return (
    <svg
      viewBox={compact ? '0 40 320 120' : '0 0 320 180'}
      className="h-auto w-full rounded-lg"
      role="img"
      aria-label={label}
    >
      <rect width="320" height="180" fill={WALL[s.room]} />
      <rect y="150" width="320" height="30" fill={FLOOR[s.room]} />
      {/* Window with the sky and whatever is parked outside. */}
      <rect x="232" y="22" width="70" height="56" rx="3" fill="#2a2f45" />
      <rect x="236" y="26" width="62" height="48" rx="2" fill="url(#sky)" />
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b3f6b" />
          <stop offset="1" stopColor="#c07a4a" />
        </linearGradient>
        <radialGradient id="glow">
          <stop offset="0" stopColor="#e8b04b" stopOpacity="0.55" />
          <stop offset="1" stopColor="#e8b04b" stopOpacity="0" />
        </radialGradient>
      </defs>
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
      <rect x="14" y="40" width="54" height="110" rx="2" fill="#2a2f45" stroke="#3a3f55" strokeWidth="1.5" />
      <rect x="18" y="72" width="46" height="2" fill="#1b1f2c" />
      <rect x="18" y="108" width="46" height="2" fill="#1b1f2c" />
      {s.shelves >= 1 ? (
        <g>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect
              key={i}
              x={20 + i * 7.5}
              y={50 - (i % 2) * 2}
              width="6"
              height={22 + (i % 2) * 2}
              rx="1"
              fill={
                i % 3 === 0 ? '#c9932f' : i % 3 === 1 ? '#6fd6c4' : '#a7adc0'
              }
            />
          ))}
        </g>
      ) : null}
      {s.shelves >= 2 ? (
        <g>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect
              key={i}
              x={20 + i * 7.5}
              y={84 + (i % 2) * 2}
              width="6"
              height={22 - (i % 2) * 2}
              rx="1"
              fill={
                i % 3 === 0 ? '#a7adc0' : i % 3 === 1 ? '#c9932f' : '#6fd6c4'
              }
            />
          ))}
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
          <rect x="140" y="38" width="40" height="30" rx="1" fill="#c9932f" />
          <rect x="144" y="42" width="32" height="22" fill="#e9e5da" />
          <line
            x1="150"
            y1="50"
            x2="170"
            y2="50"
            stroke="#8b91a8"
            strokeWidth="1"
          />
          <line
            x1="150"
            y1="55"
            x2="166"
            y2="55"
            stroke="#8b91a8"
            strokeWidth="1"
          />
        </g>
      ) : null}
      {has('stethoscope') ? (
        <g fill="none" stroke="#a7adc0" strokeWidth="2">
          <circle cx="176" cy="40" r="1.8" fill="#a7adc0" />
          <path d="M171 44 C 166 60, 168 74, 174 82 M181 44 C 186 60, 184 74, 178 82 M174 82 C 176 88, 180 88, 182 82" />
          <circle cx="182" cy="92" r="4" fill="#232838" />
        </g>
      ) : null}
      {s.room !== 'bedroom' && has('exam-table') ? (
        <g>
          <rect
            x="120"
            y="118"
            width="70"
            height="8"
            rx="2"
            fill="#6fd6c4"
            opacity="0.8"
          />
          <rect x="124" y="126" width="4" height="24" fill="#8b91a8" />
          <rect x="182" y="126" width="4" height="24" fill="#8b91a8" />
          <rect x="122" y="112" width="18" height="7" rx="3" fill="#e9e5da" />
        </g>
      ) : null}

      {/* Desk, lamp, the small things on it. */}
      {lampOn ? <circle cx="150" cy="100" r="40" fill="url(#glow)" /> : null}
      <rect x="120" y="128" width="100" height="6" rx="1" fill="#3a3f55" />
      <rect x="126" y="134" width="5" height="16" fill="#2e3446" />
      <rect x="209" y="134" width="5" height="16" fill="#2e3446" />
      <g>
        <rect x="139" y="122" width="3" height="8" fill="#8b91a8" />
        <path d="M140 122 L146 102" stroke="#8b91a8" strokeWidth="2" />
        <path
          d="M138 100 L156 100 L152 108 L142 108 Z"
          fill={lampOn ? '#e8b04b' : '#3a3f55'}
          className={
            lampOn && mood === 'studying' ? 'lantern-flame' : undefined
          }
        />
      </g>
      <rect x="160" y="121" width="28" height="7" rx="1" fill="#2e3446" />
      <rect x="164" y="112" width="20" height="9" rx="1" fill="#3b3f6b" />
      {has('notebook') ? (
        <rect x="192" y="123" width="14" height="5" rx="0.5" fill="#6fd6c4" />
      ) : null}
      {has('nameplate') ? (
        <g>
          <rect x="124" y="120" width="24" height="7" rx="1" fill="#c9932f" />
          <text
            x="136"
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
      {has('skeleton') ? (
        <g stroke="#e9e5da" strokeWidth="1.5" fill="none">
          <circle cx="86" cy="96" r="5" />
          <path d="M86 101 L86 126 M78 108 L94 108 M86 126 L80 148 M86 126 L92 148 M74 150 L98 150" />
        </g>
      ) : null}

      {/* Her. Seated, from the side, turned a little toward the desk. */}
      <g>
        <rect x="222" y="112" width="20" height="38" rx="4" fill="#2e3446" />
        <path
          d={`M ${headX - 10} 150 L ${headX - 10} 112 Q ${headX - 10} 104 ${headX - 2} 104 L ${headX + 8} 104 Q ${headX + 16} 104 ${headX + 16} 112 L ${headX + 16} 150 Z`}
          fill={WARDROBE[s.wardrobe]}
        />
        {s.wardrobe === 'coat' ? (
          <path
            d={`M ${headX - 2} 104 L ${headX + 3} 122 L ${headX + 8} 104`}
            fill="none"
            stroke="#a7adc0"
            strokeWidth="1.2"
          />
        ) : null}
        <path
          d={`M ${headX - 4} 112 L ${mood === 'studying' ? 186 : 196} ${mood === 'studying' ? 122 : 118}`}
          stroke={WARDROBE[s.wardrobe]}
          strokeWidth="7"
          strokeLinecap="round"
        />
        <circle cx={headX} cy={headY} r="9" fill="#c9a07a" />
        <path
          d={`M ${headX - 9} ${headY - 2} Q ${headX} ${headY - 14} ${headX + 9} ${headY - 2} Z`}
          fill="#3a2a25"
        />
        <circle cx={headX + 7} cy={headY - 8} r="3.5" fill="#3a2a25" />
      </g>
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
  );
};
