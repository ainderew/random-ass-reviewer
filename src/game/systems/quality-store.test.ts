/** @jest-environment jsdom */
import {
  currentTier,
  setDetectedTier,
  setQualityOverride,
} from './quality-store';

describe('quality store', () => {
  beforeEach(() => localStorage.clear());

  it('uses the stored override ahead of the detected tier', () => {
    setDetectedTier('low');
    expect(currentTier()).toBe('low');
    setQualityOverride('high');
    expect(currentTier()).toBe('high');
    expect(localStorage.getItem('aloft:quality')).toBe('high');
    setQualityOverride('auto');
    expect(currentTier()).toBe('low');
  });
});
