import type { MedtechSubject } from '@/domain/study/medtech';

// One notebook cover per MTLE subject. The art in /public/covers is text-free
// (provenance in design/subject-covers.md); titles are real text set over the
// cover's plain top third. `paper` is sampled from the art, `ink` clears 6.7:1
// on it.
export const SUBJECT_COVERS: Record<
  MedtechSubject,
  { title: string; subtitle?: string; paper: string; ink: string }
> = {
  'clinical-chemistry': {
    title: 'Clinical Chemistry',
    paper: '#bdc8aa',
    ink: '#233d2b',
  },
  'microbiology-parasitology': {
    title: 'Microbiology & Parasitology',
    paper: '#cfc0e5',
    ink: '#3b2163',
  },
  'clinical-microscopy': {
    title: 'Clinical Microscopy',
    subtitle: 'Urinalysis & body fluids',
    paper: '#fee9a3',
    ink: '#4a3210',
  },
  hematology: { title: 'Hematology', paper: '#f8cfcc', ink: '#6b1622' },
  'blood-banking-serology': {
    title: 'Blood Banking & Serology',
    subtitle: 'Immunology & immunohematology',
    paper: '#b6daf6',
    ink: '#13305c',
  },
  'histopathology-laws': {
    title: 'Histopathologic Techniques',
    subtitle: 'Medtech laws & ethics',
    paper: '#fcd0b5',
    ink: '#5a2a14',
  },
};

export const coverSrc = (subject: MedtechSubject) => `/covers/${subject}.webp`;
