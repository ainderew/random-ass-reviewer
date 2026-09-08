export type LanternMode = 'focused' | 'away' | 'rest';

// The North Star, drawn small. Stage grows the flame at the rungs; away dims
// it to an ember and the words next to it say why. Under reduced motion the
// flame changes size in steps and never breathes.
export const Lantern = ({
  stage,
  mode,
  size = 44,
}: {
  // 0 under five minutes, then one per early rung up to 3.
  stage: 0 | 1 | 2 | 3;
  mode: LanternMode;
  size?: number;
}) => {
  const flameScale =
    mode === 'away'
      ? 0.45
      : mode === 'rest'
        ? 0.7
        : [0.7, 0.85, 1, 1.15][stage]!;
  const flameColor =
    mode === 'away' ? '#c9932f' : mode === 'rest' ? '#e8b04b' : '#fff1d6';
  const glow =
    mode === 'focused' ? 0.18 + stage * 0.08 : mode === 'rest' ? 0.12 : 0.04;
  const label =
    mode === 'away'
      ? 'Lantern dimmed'
      : mode === 'rest'
        ? 'Lantern resting'
        : 'Lantern lit';
  return (
    <svg
      width={size}
      height={size * 1.6}
      viewBox="0 0 28 45"
      role="img"
      aria-label={label}
      className="shrink-0"
    >
      <circle cx="14" cy="14" r="13" fill="#e8b04b" opacity={glow} />
      <rect x="12" y="26" width="4" height="19" rx="1" fill="#8b91a8" />
      <rect x="9" y="1" width="10" height="3" rx="1" fill="#8b91a8" />
      <path d="M6 5 L22 5 L20 26 L8 26 Z" fill="#c9932f" />
      <path d="M8.5 7 L19.5 7 L18 24 L10 24 Z" fill="#14161f" opacity="0.55" />
      <g transform={`translate(14 21) scale(${flameScale}) translate(-14 -21)`}>
        <path
          className={mode === 'focused' ? 'lantern-flame' : undefined}
          d="M14 11 C 17.5 15, 18.5 19, 14 23 C 9.5 19, 10.5 15, 14 11 Z"
          fill={flameColor}
        />
      </g>
    </svg>
  );
};

// Steps at the first three rungs: it counts, a chest is secured, odds climb.
export function lanternStage(focusedMs: number): 0 | 1 | 2 | 3 {
  if (focusedMs >= 45 * 60_000) return 3;
  if (focusedMs >= 15 * 60_000) return 2;
  if (focusedMs >= 5 * 60_000) return 1;
  return 0;
}
