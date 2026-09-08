import { localDayKey, localHourOfDay, startOfLocalDay } from './local-day';

const at = (iso: string) => Date.parse(iso);

describe('localDayKey', () => {
  it('reads the date off the user clock, not UTC', () => {
    const ms = at('2026-09-07T03:00:00Z');
    expect(localDayKey(ms, 'UTC')).toBe('2026-09-07');
    expect(localDayKey(ms, 'America/New_York')).toBe('2026-09-06');
    expect(localDayKey(ms, 'Asia/Tokyo')).toBe('2026-09-07');
  });
});

describe('startOfLocalDay', () => {
  it('is UTC midnight for UTC', () => {
    expect(startOfLocalDay(at('2026-09-07T03:00:00Z'), 'UTC')).toBe(
      at('2026-09-07T00:00:00Z'),
    );
  });

  it('handles zones behind and ahead of UTC', () => {
    const ms = at('2026-09-07T03:00:00Z');
    expect(startOfLocalDay(ms, 'America/New_York')).toBe(
      at('2026-09-06T04:00:00Z'),
    );
    expect(startOfLocalDay(ms, 'Asia/Tokyo')).toBe(at('2026-09-06T15:00:00Z'));
  });

  it('falls back to UTC for an unknown zone', () => {
    expect(startOfLocalDay(at('2026-09-07T03:00:00Z'), 'Mars/Olympus')).toBe(
      at('2026-09-07T00:00:00Z'),
    );
  });
});

describe('local-day edge cases', () => {
  it('falls back to UTC for an unknown zone instead of throwing', () => {
    const ms = Date.UTC(2026, 8, 8, 23, 30);
    expect(localDayKey(ms, 'Not/AZone')).toBe(localDayKey(ms, 'UTC'));
    expect(startOfLocalDay(ms, 'Not/AZone')).toBe(startOfLocalDay(ms, 'UTC'));
  });

  it('lands on local midnight for a zone with a half-hour offset', () => {
    const ms = Date.UTC(2026, 8, 6, 12, 0);
    const start = startOfLocalDay(ms, 'Asia/Kolkata');
    expect(localHourOfDay(start, 'Asia/Kolkata')).toBeCloseTo(0, 5);
    expect(localDayKey(start, 'Asia/Kolkata')).toBe('2026-09-06');
    expect(localDayKey(start - 1, 'Asia/Kolkata')).toBe('2026-09-05');
  });

  it('gives a fractional hour on the user clock', () => {
    const ms = Date.UTC(2026, 8, 8, 14, 30, 0);
    expect(localHourOfDay(ms, 'UTC')).toBeCloseTo(14.5, 5);
    expect(localHourOfDay(ms, 'Asia/Kolkata')).toBeCloseTo(20, 5);
  });
});
