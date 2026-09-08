export type DeviceTier = 'low' | 'medium' | 'high';

export interface DeviceSignals {
  // WEBGL_debug_renderer_info string, or null when the browser hides it.
  gpu: string | null;
  cores: number | null;
  // navigator.deviceMemory, GB, Chromium only.
  memoryGb: number | null;
  // Measured over the first seconds after mount, or null before that.
  fps: number | null;
}

const INTEGRATED =
  /intel|uhd|iris|hd graphics|mali|adreno|powervr|swiftshader|llvmpipe|software/i;
const STRONG = /apple (m\d|gpu)|nvidia|geforce|rtx|radeon rx|radeon pro/i;

// Decided once, at mount. Continuous adaptation makes shadows pop on and off
// at the threshold, which reads worse than a steady lower tier.
export function classifyDevice(signals: DeviceSignals): DeviceTier {
  let score = 1;
  if (signals.gpu) {
    if (STRONG.test(signals.gpu)) score += 1;
    if (INTEGRATED.test(signals.gpu)) score -= 1;
  }
  if (signals.cores !== null) {
    if (signals.cores <= 2) score -= 1;
    if (signals.cores >= 8) score += 1;
  }
  if (signals.memoryGb !== null && signals.memoryGb <= 4) score -= 1;
  // A measured frame rate outranks every spec sheet.
  if (signals.fps !== null && signals.fps < 30) return 'low';
  if (signals.fps !== null && signals.fps < 50) score -= 1;
  if (score <= 0) return 'low';
  if (score >= 2) return 'high';
  return 'medium';
}

interface NavigatorSignals {
  hardwareConcurrency?: number;
  deviceMemory?: number;
}

export function readGpuString(
  gl: WebGLRenderingContext | WebGL2RenderingContext | null,
): string | null {
  if (!gl) return null;
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info') as {
      UNMASKED_RENDERER_WEBGL: number;
    } | null;
    if (!ext) return null;
    const value = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
    return typeof value === 'string' ? value : null;
  } catch {
    return null;
  }
}

export function readNavigatorSignals(
  nav: NavigatorSignals = navigator,
): Pick<DeviceSignals, 'cores' | 'memoryGb'> {
  return {
    cores:
      typeof nav.hardwareConcurrency === 'number'
        ? nav.hardwareConcurrency
        : null,
    memoryGb: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null,
  };
}
