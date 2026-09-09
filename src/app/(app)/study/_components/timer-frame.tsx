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
    className="mx-auto flex w-full max-w-md flex-1 flex-col md:flex-none md:pt-12 lg:pt-20"
  >
    <div className="min-h-7">{top}</div>
    <div className="flex flex-1 flex-col justify-center py-10 md:py-12">
      {children}
    </div>
    {/* On phones the action row stays in the thumb zone above the tab bar. */}
    <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-10 -mx-4 space-y-3 bg-gradient-to-t from-ground via-ground/95 to-transparent px-4 pt-6 pb-3 md:static md:mx-0 md:bg-none md:p-0">
      {actions}
    </div>
    {below ? <div className="mt-6 space-y-3">{below}</div> : null}
  </section>
);
