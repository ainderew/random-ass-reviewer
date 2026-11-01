import { DAILY_CREDITABLE_MS } from './constants';
import { applyDailyCap } from './currency';

const minutes = (n: number) => n * 60 * 1000;

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
