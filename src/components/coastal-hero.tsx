import Image from 'next/image';

// Kept as a shared component so the landing page and Today use the same art.
export const CoastalHero = () => (
  <div className="journal-hero">
    <div className="relative z-1 max-w-[26rem] py-5 sm:py-8">
      <p className="journal-label">Aloft / The study journal</p>
      <h1 className="mt-4 font-serif text-[2.5rem] leading-[1.04] tracking-tight sm:text-6xl">
        Small steps.
        <br />
        <em className="font-normal">Stronger recall.</em>
      </h1>
      <p className="mt-4 max-w-[24ch] text-sm text-ink-2 sm:max-w-[34ch] sm:text-base">
        A place for your notes, your next question, and the island you are
        growing.
      </p>
    </div>
    <Image
      src="/illustrations/field-journal-island-v1.png"
      alt=""
      width={1536}
      height={1024}
      preload
      sizes="(max-width: 640px) 60vw, 600px"
      className="journal-illustration"
    />
  </div>
);
