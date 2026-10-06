'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { SubjectShelf as Shelf } from '@/domain/types';
import { ArrowRightIcon } from '@/components/icons';
import { coverSrc, SUBJECT_COVERS } from './subject-covers';
import { CoverStatus, statusOf } from './cover-status';

const RANK = { due: 0, done: 1, empty: 2 } as const;

// The Review start: all subjects first, then a swipeable row of notebooks,
// subjects with cards to review leading. Each cover carries one status.
export const SubjectShelf = ({ shelf }: { shelf: Shelf }) => {
  const scroller = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const subjects = [...shelf.subjects].sort(
    (a, b) => RANK[statusOf(a).state] - RANK[statusOf(b).state],
  );

  // The cover filling the start of the row is the current one.
  useEffect(() => {
    const root = scroller.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting)
            setActive(Number((entry.target as HTMLElement).dataset.index));
      },
      { root, threshold: 0.6 },
    );
    root.querySelectorAll('li').forEach((li) => observer.observe(li));
    return () => observer.disconnect();
  }, []);

  const goTo = (index: number) => {
    const reduce = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    scroller.current?.children[index]?.scrollIntoView?.({
      behavior: reduce ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'start',
    });
  };

  return (
    <div className="space-y-6">
      <Link href="/review?subject=all" className="everything-due">
        <Image
          src="/illustrations/study-cards-v1.png"
          alt=""
          width={1536}
          height={1024}
          sizes="72px"
          className="w-18 shrink-0"
          priority
        />
        <span className="min-w-0 flex-1 space-y-1.5">
          <span className="block font-display text-xl font-extrabold tracking-[-0.015em] text-ink">
            All subjects
          </span>
          <CoverStatus due={shelf.due} approved={shelf.approved} />
        </span>
        <ArrowRightIcon className="shrink-0 text-focus" />
      </Link>

      <section aria-labelledby="shelf-heading" className="space-y-3">
        <h2
          id="shelf-heading"
          className="font-display text-xl font-extrabold text-ink"
        >
          Or pick a subject
        </h2>
        <ul ref={scroller} className="shelf-scroller">
          {subjects.map(({ subject, due, approved }, i) => {
            const cover = SUBJECT_COVERS[subject];
            return (
              <li key={subject} data-index={i} className="shelf-slide">
                <Link
                  href={approved ? `/review?subject=${subject}` : '/notes'}
                  className="subject-cover"
                  data-empty={approved === 0 || undefined}
                  style={
                    {
                      '--cover-paper': cover.paper,
                      '--cover-ink': cover.ink,
                    } as CSSProperties
                  }
                >
                  <span className="subject-cover-art">
                    <Image
                      src={coverSrc(subject)}
                      alt=""
                      fill
                      sizes="(min-width: 640px) 256px, 70vw"
                      priority={i < 2}
                    />
                    <span className="subject-cover-title">
                      {cover.title}
                      {cover.subtitle && <small>{cover.subtitle}</small>}
                    </span>
                    <span className="subject-cover-status">
                      <CoverStatus due={due} approved={approved} />
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="shelf-dots">
          {subjects.map(({ subject }, i) => (
            <button
              key={subject}
              type="button"
              className="shelf-dot"
              aria-label={`Show ${SUBJECT_COVERS[subject].title}`}
              aria-current={i === active || undefined}
              onClick={() => goTo(i)}
            >
              <span />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
