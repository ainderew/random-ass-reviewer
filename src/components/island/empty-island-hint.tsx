import Link from 'next/link';

// Shown over the canvas until the first piece lands. The island is the
// payoff; the hint points at the thing that pays for it.
export const EmptyIslandHint = () => (
  <div className="pointer-events-none absolute inset-x-0 top-4 z-(--z-sticky) flex justify-center px-4">
    <p className="pointer-events-auto max-w-sm rounded-lg border border-hairline bg-ground/90 px-4 py-3 text-center text-sm leading-relaxed text-ink-2 backdrop-blur-sm">
      Nothing built yet. Study to earn Focus, then place your first structure.{' '}
      <Link href="/study" className="text-focus underline underline-offset-4">
        Start a session
      </Link>
    </p>
  </div>
);
