import { formatClock, formatMinutes } from './format-time';

describe('formatClock', () => {
  it('renders MM:SS under an hour', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(65_000)).toBe('01:05');
    expect(formatClock(59 * 60_000 + 59_000)).toBe('59:59');
  });

  it('adds hours once past sixty minutes', () => {
    expect(formatClock(3_600_000)).toBe('1:00:00');
    expect(formatClock(3_600_000 + 61_000)).toBe('1:01:01');
  });

  it('clamps negatives to zero', () => {
    expect(formatClock(-500)).toBe('00:00');
  });
});

describe('formatMinutes', () => {
  it('rounds down and handles the singular', () => {
    expect(formatMinutes(59_000)).toBe('0 min');
    expect(formatMinutes(60_000)).toBe('1 min');
    expect(formatMinutes(25 * 60_000 + 30_000)).toBe('25 min');
  });
});
