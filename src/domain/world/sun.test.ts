import { hexToRgb } from './color';
import {
  dayFactorForHour,
  skyPaletteFor,
  sunPositionForLocalTime,
} from './sun';

describe('sunPositionForLocalTime', () => {
  it('peaks near noon with dayFactor 1', () => {
    const noon = sunPositionForLocalTime({ localHour: 13 });
    expect(noon.dayFactor).toBe(1);
    expect(noon.altitude).toBeCloseTo(1.2, 5);
  });

  it('is lowest at night with dayFactor 0', () => {
    const midnight = sunPositionForLocalTime({ localHour: 0 });
    expect(midnight.dayFactor).toBe(0);
    expect(midnight.altitude).toBeLessThan(0);
  });

  it('is continuous across the 23:59 to 00:00 boundary', () => {
    const before = sunPositionForLocalTime({ localHour: 23.999 });
    const after = sunPositionForLocalTime({ localHour: 0 });
    expect(Math.abs(before.altitude - after.altitude)).toBeLessThan(0.01);
    expect(Math.abs(before.dayFactor - after.dayFactor)).toBeLessThan(0.01);
  });

  it('has no jumps anywhere in the day', () => {
    for (let h = 0; h < 24; h += 0.01) {
      const a = dayFactorForHour(h);
      const b = dayFactorForHour(h + 0.01);
      expect(Math.abs(a - b)).toBeLessThan(0.02);
    }
  });

  it('keeps some light through golden hour', () => {
    expect(dayFactorForHour(18)).toBeGreaterThan(0.5);
    expect(dayFactorForHour(20)).toBeGreaterThan(0);
    expect(dayFactorForHour(21)).toBe(0);
  });
});

describe('skyPaletteFor', () => {
  it('is warm at golden hour', () => {
    const [r, , b] = hexToRgb(skyPaletteFor(0.7, 18).horizonColor);
    expect(r).toBeGreaterThan(b + 80);
  });

  it('is cool at night', () => {
    const [r, , b] = hexToRgb(skyPaletteFor(0, 1).topColor);
    expect(b).toBeGreaterThan(r);
    expect(skyPaletteFor(0, 1).ambientIntensity).toBeLessThan(
      skyPaletteFor(1, 12).ambientIntensity,
    );
  });

  it('matches at both ends of the day', () => {
    expect(skyPaletteFor(0, 23.999).fogColor).toBe(
      skyPaletteFor(0, 0).fogColor,
    );
  });
});
