import Link from 'next/link';
import type { MedtechSubject } from '@/domain/study/medtech';
import { ChevronLeftIcon } from '@/components/icons';
import { SUBJECT_COVERS } from './subject-covers';

export const SessionHeading = ({ subject }: { subject?: MedtechSubject }) => (
  <div className="mb-4 flex items-center justify-between gap-4">
    <Link href="/review" className="session-back">
      <ChevronLeftIcon size={20} />
      Subjects
    </Link>
    <h1 className="text-sm text-muted">
      {subject ? SUBJECT_COVERS[subject].title : 'All subjects'}
    </h1>
  </div>
);
