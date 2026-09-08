// A chest drawn once, reused for every reveal. Lid rotates open.
export const ChestIcon = ({ open, glow }: { open: boolean; glow: string }) => (
  <svg
    viewBox="0 0 120 100"
    width="132"
    height="110"
    aria-hidden="true"
    focusable="false"
    className="overflow-visible"
  >
    {open ? (
      <ellipse cx="60" cy="58" rx="44" ry="16" fill={glow} opacity="0.55">
        <animate
          attributeName="opacity"
          values="0.55;0.25;0.55"
          dur="1.6s"
          repeatCount="indefinite"
        />
      </ellipse>
    ) : null}
    <rect x="18" y="48" width="84" height="40" rx="6" fill="#8c5a46" />
    <rect x="18" y="48" width="84" height="6" fill="#6f4536" />
    <rect x="52" y="60" width="16" height="12" rx="2" fill="#e8b04b" />
    <g
      style={{
        transformOrigin: '18px 48px',
        transform: open ? 'rotate(-58deg)' : 'rotate(0deg)',
        transition: 'transform 380ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <path d="M18 48 Q18 22 60 22 Q102 22 102 48 Z" fill="#c96f4a" />
      <path
        d="M18 48 Q18 30 60 30 Q102 30 102 48 Z"
        fill="#a85a3a"
        opacity="0.5"
      />
      <rect x="52" y="40" width="16" height="10" rx="2" fill="#e8b04b" />
    </g>
  </svg>
);
