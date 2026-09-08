import {
  SESSION_LENGTHS_MIN,
  type SessionLength,
} from '@/domain/session/rungs';

const chip =
  'min-h-11 rounded-full border px-4 text-[0.9375rem] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

// A shape for the session. The server never sees it; ending early pays what
// was earned and finishing is a choice, not a wall.
export const LengthPicker = ({
  value,
  onChange,
}: {
  value: SessionLength;
  onChange: (length: SessionLength) => void;
}) => {
  const options: Array<{ length: SessionLength; label: string }> = [
    ...SESSION_LENGTHS_MIN.map((m) => ({
      length: m as SessionLength,
      label: `${m} min`,
    })),
    { length: null, label: 'Open' },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Session length"
      className="flex flex-wrap gap-2"
    >
      {options.map((option) => {
        const on = option.length === value;
        return (
          <button
            key={option.label}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(option.length)}
            className={`${chip} ${on ? 'border-focus text-ink' : 'border-hairline text-ink-2 hover:text-ink'}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
