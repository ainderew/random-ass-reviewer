import Image from 'next/image';
import Link from 'next/link';
import type { MedtechSubject } from '@/domain/study/medtech';
import { ChevronLeftIcon } from '@/components/icons';
import { coverSrc, SUBJECT_COVERS } from './subject-covers';

// A session's heading: the way back to the shelf where a phone expects it,
// top left, then the notebook being reviewed as the page title.
export const SessionHeading = ({ subject }: { subject?: MedtechSubject }) => {
  const cover = subject ? SUBJECT_COVERS[subject] : null;
  return (
    <div className="mb-5 space-y-1">
      <Link href="/review" className="session-back">
        <ChevronLeftIcon size={20} />
        Subjects
      </Link>
      <div className="flex items-center gap-3">
        {subject ? (
          <Image
            src={coverSrc(subject)}
            alt=""
            width={600}
            height={800}
            sizes="36px"
            className="subject-chip-thumb"
          />
        ) : (
          <Image
            src="/illustrations/study-cards-v1.png"
            alt=""
            width={1536}
            height={1024}
            sizes="48px"
            className="w-12 shrink-0"
          />
        )}
        <h1 className="min-w-0 font-display text-[1.75rem] leading-tight font-extrabold tracking-[-0.015em] text-ink">
          {cover?.title ?? 'All subjects'}
        </h1>
      </div>
    </div>
  );
};
