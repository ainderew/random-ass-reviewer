// Small deterministic hash for stable per-id variation (stagger, phase, colour).
export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// 0..1, stable for the same input.
export function unitHash(input: string): number {
  return hashString(input) / 4294967296;
}
