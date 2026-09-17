import { readingElapsedMs } from './reading';
it('bounds reading time by elapsed time, planned duration, and 30 minutes', () => {
  expect(readingElapsedMs(100, 50, 300000)).toBe(0);
  expect(readingElapsedMs(0, 1234, 300000)).toBe(1234);
  expect(readingElapsedMs(0, 900000, 300000)).toBe(300000);
  expect(readingElapsedMs(0, 9000000, 9000000)).toBe(1800000);
});
