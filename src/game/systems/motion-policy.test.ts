import {
  cameraDriftEnabled,
  particlesEnabled,
  scholarCountFor,
  windAmplitude,
} from './motion-policy';

describe('reduced motion contract', () => {
  it('sets wind amplitude to 0', () => {
    expect(windAmplitude(0.16, true)).toBe(0);
    expect(windAmplitude(0.16, false)).toBe(0.16);
  });

  it('disables particles', () => {
    expect(particlesEnabled(true)).toBe(false);
    expect(particlesEnabled(false)).toBe(true);
  });

  it('disables idle camera drift, and otherwise waits four seconds', () => {
    expect(cameraDriftEnabled(true, 10_000)).toBe(false);
    expect(cameraDriftEnabled(false, 3_999)).toBe(false);
    expect(cameraDriftEnabled(false, 4_000)).toBe(true);
  });
});

describe('scholarCountFor', () => {
  it('scales with placements and caps at 8', () => {
    expect(scholarCountFor(0)).toBe(0);
    expect(scholarCountFor(2)).toBe(0);
    expect(scholarCountFor(3)).toBe(1);
    expect(scholarCountFor(9)).toBe(3);
    expect(scholarCountFor(30)).toBe(8);
    expect(scholarCountFor(300)).toBe(8);
  });
});
