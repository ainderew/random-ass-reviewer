import { z } from 'zod';

// PRC Resolution 13, s. 2023. Confirm the applicable version for the exam sitting.
export const MTLE_BLUEPRINT = {
  version: 'prc-mtle-2023',
  url: 'https://www.prc.gov.ph/sites/default/files/2023-13%20published_Annex_TOS.pdf',
};
export const MTLE_SUBJECTS = [
  { id: 'clinical-chemistry', label: 'Clinical Chemistry' },
  { id: 'microbiology-parasitology', label: 'Microbiology and Parasitology' },
  { id: 'hematology', label: 'Hematology' },
  { id: 'blood-banking-serology', label: 'Blood Banking and Serology' },
  { id: 'clinical-microscopy', label: 'Clinical Microscopy' },
  {
    id: 'histopathology-laws',
    label: 'Histopathologic Techniques, Medtech Laws and Ethics',
  },
] as const;
export const subjectSchema = z.enum(MTLE_SUBJECTS.map((s) => s.id));
export type MedtechSubject = z.infer<typeof subjectSchema>;
export const examMonthSchema = z
  .string()
  .regex(/^20\d{2}-(0[1-9]|1[0-2])$/, 'Choose a valid exam month.');
