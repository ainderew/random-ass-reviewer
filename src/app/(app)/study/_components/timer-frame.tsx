import type { ReactNode } from 'react';

// Shared skeleton for every timer state: a top line, a centred stage, and an
// action row. On phones the frame fills the viewport so the action lands in
// the thumb zone. From tablet up it hugs its content so the action stays
// close to what it acts on.
export const TimerFrame = ({
  top,
  children,
  actions,
  label,
}: {
  top?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  label: string;
}) => (
  <section
    aria-label={label}
    className="mx-auto flex w-full max-w-md flex-1 flex-col md:flex-none md:pt-12 lg:pt-20"
  >
    <div className="min-h-7">{top}</div>
    <div className="flex flex-1 flex-col justify-center py-10 md:py-12">
      {children}
    </div>
    <div className="space-y-3">{actions}</div>
  </section>
);
