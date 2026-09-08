import type { DeviceTier } from './device-tier';

export interface QualitySettings {
  shadows: boolean;
  shadowMapSize: number;
  postProcessing: 'off' | 'bloom' | 'full';
  particles: number;
  scholarsMax: number;
  dprMax: number;
  wind: boolean;
}

// The 3D scene only. Study, review, and notes have no 3D dependency by design.
export const QUALITY: Record<DeviceTier, QualitySettings> = {
  low: {
    shadows: false,
    shadowMapSize: 512,
    postProcessing: 'off',
    particles: 0,
    scholarsMax: 3,
    dprMax: 1,
    wind: false,
  },
  medium: {
    shadows: true,
    shadowMapSize: 512,
    postProcessing: 'bloom',
    particles: 80,
    scholarsMax: 6,
    dprMax: 1.5,
    wind: true,
  },
  high: {
    shadows: true,
    shadowMapSize: 1024,
    postProcessing: 'full',
    particles: 200,
    scholarsMax: 8,
    dprMax: 2,
    wind: true,
  },
};

export type QualityOverride = DeviceTier | 'auto';

// The override wins over detection. A user who knows their machine can force it.
export function resolveTier(
  detected: DeviceTier,
  override: QualityOverride,
): DeviceTier {
  return override === 'auto' ? detected : override;
}
