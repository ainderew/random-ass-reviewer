import type { ReactNode } from 'react';

// Shared skeleton for every timer state: a top line, a centred stage, and an
// action row. On phones the frame fills the viewport so the action lands in
// the thumb zone. From tablet up it hugs its content so the action stays
// close to what it acts on.
export const TimerFrame = ({
  top,
  children,
  actions,
  below,
  label,
}: {
  top?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  // Small print after the action: today so far, the next milestone.
  below?: ReactNode;
  label: string;
}) => (
  <section
    aria-label={label}
    className="mx-auto flex w-full max-w-lg flex-1 flex-col rounded-3xl border border-hairline bg-ground-2 px-5 pt-4 pb-6 md:flex-none md:px-10 md:pt-6"
  >
    <div className="min-h-7">{top}</div>
    <div className="flex flex-1 flex-col justify-center py-5 md:py-8">
      {children}
    </div>
    {/* On phones the action row stays in the thumb zone above the tab bar. */}
    <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 -mx-4 space-y-3 bg-ground-2 px-4 pt-6 pb-3 md:static md:mx-0 md:bg-ground-2 md:p-0">
      {actions}
    </div>
    {below ? <div className="mt-6 space-y-3">{below}</div> : null}
  </section>
);
