import type { MedtechSubject } from '../study/medtech';
export interface SubjectProgress {
  subject: MedtechSubject | null;
  total: number;
  approved: number;
  practiced: number;
  topics: number;
}
export interface StudyPlan {
  examMonth: string | null;
  dailyNewCards: number;
  subjects: SubjectProgress[];
  mistakes: Array<{
    cardId: string;
    sourceId: string;
    question: string;
    answer: string;
    explanation: string;
    sourceQuote: string;
  }>;
}
