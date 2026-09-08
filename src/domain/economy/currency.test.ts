import { DAILY_CREDITABLE_MS } from './constants';
import { applyDailyCap, calculateFocusAward } from './currency';

const minutes = (n: number) => n * 60 * 1000;

describe('calculateFocusAward', () => {
  it('pays 10 Focus per credited minute', () => {
    expect(
      calculateFocusAward({ creditedMs: minutes(25), multiplier: 1 }),
    ).toBe(250);
  });

  it('rounds partial minutes down', () => {
    expect(
      calculateFocusAward({ creditedMs: minutes(7.5), multiplier: 1 }),
    ).toBe(70);
  });

  it('applies the multiplier and rounds the result down', () => {
    expect(
      calculateFocusAward({ creditedMs: minutes(7), multiplier: 1.25 }),
    ).toBe(87);
  });

  it('pays for a single whole minute and nothing under it', () => {
    expect(calculateFocusAward({ creditedMs: minutes(1), multiplier: 1 })).toBe(
      10,
    );
    expect(
      calculateFocusAward({ creditedMs: minutes(1) - 1, multiplier: 1 }),
    ).toBe(0);
  });

  it('pays nothing for a non-positive multiplier', () => {
    expect(
      calculateFocusAward({ creditedMs: minutes(30), multiplier: 0 }),
    ).toBe(0);
  });
});

describe('applyDailyCap', () => {
  it('credits the whole session when under the cap', () => {
    expect(
      applyDailyCap({
        focusedMs: minutes(45),
        alreadyCreditedTodayMs: minutes(60),
      }),
    ).toBe(minutes(45));
  });

  it('credits only the remainder when the session crosses the cap', () => {
    const already = DAILY_CREDITABLE_MS - minutes(10);
    expect(
      applyDailyCap({
        focusedMs: minutes(45),
        alreadyCreditedTodayMs: already,
      }),
    ).toBe(minutes(10));
  });

  it('returns 0 when the daily cap is already consumed', () => {
    expect(
      applyDailyCap({
        focusedMs: minutes(45),
        alreadyCreditedTodayMs: DAILY_CREDITABLE_MS,
      }),
    ).toBe(0);
  });

  it('never returns a negative value', () => {
    expect(
      applyDailyCap({
        focusedMs: minutes(45),
        alreadyCreditedTodayMs: DAILY_CREDITABLE_MS * 2,
      }),
    ).toBe(0);
    expect(
      applyDailyCap({ focusedMs: -minutes(5), alreadyCreditedTodayMs: 0 }),
    ).toBe(0);
  });
});
