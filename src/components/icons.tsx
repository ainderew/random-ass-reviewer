import type { SVGProps } from 'react';

// One hand-drawn set, 24px grid, 1.75 stroke, round joins. Keep every new
// icon on the same grid so the shell stays coherent.
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const Base = ({ size = 24, children, ...props }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    {children}
  </svg>
);

export const HomeIcon = (props: IconProps) => (
  <Base {...props}>
    <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />
  </Base>
);

export const TimerIcon = (props: IconProps) => (
  <Base {...props}>
    <circle cx="12" cy="13.5" r="7.5" />
    <path d="M12 9.5v4l2.5 1.5M9.5 2.5h5" />
  </Base>
);

export const NotesIcon = (props: IconProps) => (
  <Base {...props}>
    <path d="M6 3h8.5L19 7.5V21H6z" />
    <path d="M14 3v5h5M9 12.5h6M9 16.5h6" />
  </Base>
);

export const ReviewIcon = (props: IconProps) => (
  <Base {...props}>
    <rect x="3" y="7" width="13" height="14" rx="2" />
    <path d="M8 3.5h10.5a2 2 0 0 1 2 2V17" />
  </Base>
);

export const IslandIcon = (props: IconProps) => (
  <Base {...props}>
    <path d="M4 13h16l-3.5 7h-9z" />
    <path d="M8.5 13c0-4 1.5-6.5 3.5-6.5s3.5 2.5 3.5 6.5M12 6.5V3.5" />
  </Base>
);

export const SignOutIcon = (props: IconProps) => (
  <Base {...props}>
    <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 8l4 4-4 4M19 12H9" />
  </Base>
);

// Currency glyphs. Shape carries meaning, so colour never has to.
export const BoltGlyph = ({ size = 16, ...props }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <path d="M9 1 3 9h4l-1 6 6-8H8z" fill="currentColor" />
  </svg>
);

export const DiamondGlyph = ({ size = 16, ...props }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <path
      d="M8 1.5 14 8l-6 6.5L2 8z"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
    />
  </svg>
);

export const SpeakerIcon = (props: IconProps) => (
  <Base {...props}>
    <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" />
    <path d="M15.5 9.5a3.5 3.5 0 0 1 0 5M18 7a7 7 0 0 1 0 10" />
  </Base>
);

export const SpeakerOffIcon = (props: IconProps) => (
  <Base {...props}>
    <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" />
    <path d="M16 9.5l5 5M21 9.5l-5 5" />
  </Base>
);

export const RainIcon = (props: IconProps) => (
  <Base {...props}>
    <path d="M7.5 14.5H17a3.5 3.5 0 0 0 .4-6.98A5 5 0 0 0 7.6 8.6a3 3 0 0 0-.1 5.9z" />
    <path d="M8.5 17.5l-1 2.5M12.5 17.5l-1 2.5M16.5 17.5l-1 2.5" />
  </Base>
);

export const NoiseIcon = (props: IconProps) => (
  <Base {...props}>
    <path d="M3 9c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0" />
    <path d="M3 15c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0" />
  </Base>
);

export const PianoIcon = (props: IconProps) => (
  <Base {...props}>
    <path d="M10 17.5V4.5c2.5 1.5 5 2 6.5 4.5" />
    <ellipse cx="7.5" cy="17.5" rx="2.75" ry="2.25" />
  </Base>
);

export const SettingsIcon = (props: IconProps) => (
  <Base {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </Base>
);

export const ProgressIcon = (props: IconProps) => (
  <Base {...props}>
    <path d="M4 4v16h16M8 15v-4M12 15V7M16 15v-6" />
  </Base>
);

export const ArrowRightIcon = (props: IconProps) => (
  <Base {...props}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Base>
);

export const CheckIcon = (props: IconProps) => (
  <Base {...props}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Base>
);

export const PlusIcon = (props: IconProps) => (
  <Base {...props}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);

export const ChevronLeftIcon = (props: IconProps) => (
  <Base {...props}>
    <path d="m15 5-7 7 7 7" />
  </Base>
);

export const CalendarIcon = (props: IconProps) => (
  <Base {...props}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </Base>
);

// A miss turned around: the arrow comes back to where it started.
export const RecoverIcon = (props: IconProps) => (
  <Base {...props}>
    <path d="M4 12a8 8 0 1 0 2.5-5.8" />
    <path d="M4 4v4.5h4.5" />
  </Base>
);

export const ChevronRightIcon = (props: IconProps) => (
  <Base {...props}>
    <path d="m9 5 7 7-7 7" />
  </Base>
);
