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

export const SettingsIcon = (props: IconProps) => (
  <Base {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </Base>
);
