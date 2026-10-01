import type { ReactNode } from 'react';

// Little drawings for the care tray, in the same plum line as the cat.
export type PetItem = 'kibble' | 'treat' | 'brush' | 'wand' | 'mouse' | 'yarn';

const Frame = ({ children }: { children: ReactNode }) => (
  <svg
    viewBox="0 0 40 40"
    width="40"
    height="40"
    aria-hidden="true"
    stroke="#38273d"
    strokeWidth="2"
    strokeLinejoin="round"
    strokeLinecap="round"
  >
    {children}
  </svg>
);

const DRAWINGS: Record<PetItem, ReactNode> = {
  kibble: (
    <>
      <circle cx="14" cy="17" r="3.3" fill="#b97a4f" />
      <circle cx="20" cy="14.5" r="3.3" fill="#c98a5c" />
      <circle cx="26" cy="17" r="3.3" fill="#b97a4f" />
      <path d="M5 19h30c0 8-6.5 13-15 13S5 27 5 19z" fill="#b7a2d8" />
    </>
  ),
  treat: (
    <>
      <path
        d="M5 20c4-7 15-9 22-3l7-5v16l-7-5c-7 6-18 4-22-3z"
        fill="#f3a68e"
      />
      <circle cx="11.5" cy="19" r="1.5" fill="#38273d" stroke="none" />
      <path d="M18 15c1.5 3 1.5 7 0 10" fill="none" />
    </>
  ),
  brush: (
    <>
      <rect
        x="2"
        y="25"
        width="18"
        height="7"
        rx="3.5"
        transform="rotate(-35 11 28.5)"
        fill="#f5c08c"
      />
      <rect x="14" y="7" width="22" height="13" rx="6.5" fill="#b7a2d8" />
      <path d="M18 20v4.5M22.5 20v4.5M27 20v4.5M31.5 20v4.5" fill="none" />
    </>
  ),
  wand: (
    <>
      <path d="M5 36 21 15" fill="none" />
      <ellipse
        cx="27.5"
        cy="10.5"
        rx="9"
        ry="4.6"
        transform="rotate(-42 27.5 10.5)"
        fill="#e9a3c1"
      />
      <path d="M22 16 33.5 5" fill="none" />
      <circle cx="21" cy="15.5" r="2.6" fill="#f5c08c" />
    </>
  ),
  mouse: (
    <>
      <path d="M9 28c-5 0-6 5-2 7" fill="none" />
      <circle cx="22" cy="15" r="5" fill="#efb2b8" />
      <path d="M9 28c0-8 7-13 15-13 5 0 9 4 11 8l-3 2v3z" fill="#b3aec2" />
      <circle cx="29" cy="21.5" r="1.4" fill="#38273d" stroke="none" />
    </>
  ),
  yarn: (
    <>
      <path d="M29 27c4 3 5 7 3 9" fill="none" />
      <circle cx="19" cy="20" r="12" fill="#8cc79b" />
      <path
        d="M9.5 14.5c6 2 12 8.5 14 16.5M13.5 9.5c6 4 10.5 11.5 11.5 19.5M23.5 8.7c-4 5-10.5 9-17 10.3"
        fill="none"
      />
    </>
  ),
};

export const PetIcon = ({ item }: { item: PetItem }) => (
  <Frame>{DRAWINGS[item]}</Frame>
);

const HEART =
  'M12 20.5s-7.6-4.6-9.4-9.4C1.4 7.8 3.6 4.8 6.7 4.8c2 0 3.6 1.1 5.3 3 1.7-1.9 3.3-3 5.3-3 3.1 0 5.3 3 4.1 6.3-1.8 4.8-9.4 9.4-9.4 9.4z';

// Five hearts filled to the happiness, over five empty ones.
export const HappinessHearts = ({ value }: { value: number }) => {
  const row = (filled: boolean) => (
    <span className="flex gap-[3px]">
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          width="20"
          height="20"
          className="shrink-0"
        >
          <path
            d={HEART}
            strokeWidth="1.6"
            strokeLinejoin="round"
            className={
              filled ? 'fill-focus stroke-ink' : 'fill-ground-3 stroke-hairline'
            }
          />
        </svg>
      ))}
    </span>
  );
  return (
    <span className="relative inline-block leading-none" aria-hidden="true">
      {row(false)}
      <span
        className="absolute inset-y-0 left-0 overflow-hidden transition-[width] duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      >
        {row(true)}
      </span>
    </span>
  );
};
