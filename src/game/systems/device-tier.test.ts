import { classifyDevice } from './device-tier';
import { QUALITY, resolveTier } from './quality-settings';

describe('classifyDevice', () => {
  it('returns low for an integrated GPU with few cores', () => {
    expect(
      classifyDevice({
        gpu: 'Intel(R) UHD Graphics 620',
        cores: 2,
        memoryGb: 4,
        fps: null,
      }),
    ).toBe('low');
  });

  it('returns low when the measured frame rate is poor, whatever the hardware says', () => {
    expect(
      classifyDevice({
        gpu: 'NVIDIA GeForce RTX 3080',
        cores: 16,
        memoryGb: 32,
        fps: 24,
      }),
    ).toBe('low');
  });

  it('returns high for a strong GPU with many cores at full frame rate', () => {
    expect(
      classifyDevice({ gpu: 'Apple M2', cores: 8, memoryGb: null, fps: 60 }),
    ).toBe('high');
  });

  it('returns medium when nothing is known', () => {
    expect(
      classifyDevice({ gpu: null, cores: null, memoryGb: null, fps: null }),
    ).toBe('medium');
  });
});

describe('quality mapping', () => {
  it('low disables post-processing, shadows, wind, and particles', () => {
    expect(QUALITY.low).toMatchObject({
      postProcessing: 'off',
      particles: 0,
      shadows: false,
      wind: false,
    });
    expect(QUALITY.low.dprMax).toBe(1);
  });

  it('the override wins over detection', () => {
    expect(resolveTier('low', 'high')).toBe('high');
    expect(resolveTier('high', 'low')).toBe('low');
    expect(resolveTier('medium', 'auto')).toBe('medium');
  });
});
