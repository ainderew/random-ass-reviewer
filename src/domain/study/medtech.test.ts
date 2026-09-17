import { updateProfileRequestSchema } from '@/domain/types/user';
import { MTLE_SUBJECTS, examMonthSchema } from './medtech';
it('accepts a planning month without inventing an exam day and bounds the new-card workload', () => {
  expect(examMonthSchema.parse('2027-03')).toBe('2027-03');
  expect(examMonthSchema.safeParse('2027-13').success).toBe(false);
  expect(examMonthSchema.safeParse('2027-03-01').success).toBe(false);
  expect(
    updateProfileRequestSchema.safeParse({ examMonth: null, dailyNewCards: 0 })
      .success,
  ).toBe(true);
  expect(
    updateProfileRequestSchema.safeParse({ dailyNewCards: 21 }).success,
  ).toBe(false);
  expect(
    updateProfileRequestSchema.safeParse({ dailyNewCards: -1 }).success,
  ).toBe(false);
  expect(new Set(MTLE_SUBJECTS.map((s) => s.id)).size).toBe(6);
});
