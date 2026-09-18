import Image from 'next/image';

// Shared introduction for Today and the landing page. Study content stays in HTML.
export const CoastalHero = () => (
  <div className="study-intro">
    <div>
      <h1 className="font-serif text-3xl font-extrabold tracking-tight sm:text-4xl">
        Make a little room
        <br className="sm:hidden" /> for learning.
      </h1>
      <p className="mt-3 max-w-md text-sm text-ink-2 sm:text-base">
        Your notes. A few good questions. A little more remembered.
      </p>
    </div>
    <Image
      src="/illustrations/study-cards-v1.png"
      alt=""
      width={1536}
      height={1024}
      sizes="(max-width: 640px) 100px, 160px"
      className="w-24 shrink-0 sm:w-40"
    />
  </div>
);
