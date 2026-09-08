// Flat-shaded triangle soup for placeholder props. Every triangle gets its
// own three vertices and one face normal, so weld() in the optimiser keeps
// the low-poly look instead of smoothing it away.

export type Rgb = readonly [number, number, number];
export type Vec3 = readonly [number, number, number];

// glTF vertex colours are linear. Palette hexes are sRGB.
export function hexToLinear(hex: string): Rgb {
  const n = parseInt(hex.replace('#', ''), 16);
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return [channel(n >> 16), channel((n >> 8) & 255), channel(n & 255)];
}

export class MeshBuilder {
  readonly positions: number[] = [];
  readonly normals: number[] = [];
  readonly colors: number[] = [];

  get triangleCount(): number {
    return this.positions.length / 9;
  }

  triangle(a: Vec3, b: Vec3, c: Vec3, color: Rgb): this {
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const uz = b[2] - a[2];
    const vx = c[0] - a[0];
    const vy = c[1] - a[1];
    const vz = c[2] - a[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;
    for (const p of [a, b, c]) {
      this.positions.push(p[0], p[1], p[2]);
      this.normals.push(nx, ny, nz);
      this.colors.push(color[0], color[1], color[2]);
    }
    return this;
  }

  quad(a: Vec3, b: Vec3, c: Vec3, d: Vec3, color: Rgb): this {
    return this.triangle(a, b, c, color).triangle(a, c, d, color);
  }

  // Axis-aligned box centred at (cx, cy, cz).
  box(center: Vec3, size: Vec3, color: Rgb, rotY = 0): this {
    const [cx, cy, cz] = center;
    const [w, h, d] = size;
    const hx = w / 2;
    const hy = h / 2;
    const hz = d / 2;
    const cos = Math.cos(rotY);
    const sin = Math.sin(rotY);
    const p = (x: number, y: number, z: number): Vec3 => [
      cx + x * cos - z * sin,
      cy + y,
      cz + x * sin + z * cos,
    ];
    const v = [
      p(-hx, -hy, -hz),
      p(hx, -hy, -hz),
      p(hx, -hy, hz),
      p(-hx, -hy, hz),
      p(-hx, hy, -hz),
      p(hx, hy, -hz),
      p(hx, hy, hz),
      p(-hx, hy, hz),
    ] as const;
    this.quad(v[3], v[2], v[1], v[0], color); // bottom
    this.quad(v[4], v[5], v[6], v[7], color); // top
    this.quad(v[0], v[1], v[5], v[4], color); // -z
    this.quad(v[2], v[3], v[7], v[6], color); // +z
    this.quad(v[3], v[0], v[4], v[7], color); // -x
    this.quad(v[1], v[2], v[6], v[5], color); // +x
    return this;
  }

  // Surface of revolution around the y axis. `profile` runs bottom to top as
  // [radius, y, colour]. A radius of 0 makes a tip; the ends are capped.
  lathe(
    profile: ReadonlyArray<readonly [number, number, Rgb]>,
    segments: number,
    center: Vec3 = [0, 0, 0],
    phase = 0,
  ): this {
    const ring = (r: number, y: number, i: number): Vec3 => {
      const t = phase + (i / segments) * Math.PI * 2;
      return [
        center[0] + r * Math.cos(t),
        center[1] + y,
        center[2] + r * Math.sin(t),
      ];
    };
    for (let j = 0; j < profile.length - 1; j += 1) {
      const [r0, y0, c0] = profile[j]!;
      const [r1, y1] = profile[j + 1]!;
      for (let i = 0; i < segments; i += 1) {
        const a = ring(r0, y0, i);
        const b = ring(r0, y0, i + 1);
        const c = ring(r1, y1, i + 1);
        const d = ring(r1, y1, i);
        if (r1 === 0) this.triangle(a, d, b, c0);
        else if (r0 === 0) this.triangle(a, c, b, c0);
        else this.quad(a, d, c, b, c0);
      }
    }
    const [rBottom, yBottom, cBottom] = profile[0]!;
    const [rTop, yTop, cTop] = profile[profile.length - 1]!;
    if (rBottom > 0) {
      const centre: Vec3 = [center[0], center[1] + yBottom, center[2]];
      for (let i = 0; i < segments; i += 1) {
        this.triangle(
          centre,
          ring(rBottom, yBottom, i),
          ring(rBottom, yBottom, i + 1),
          cBottom,
        );
      }
    }
    if (rTop > 0) {
      const centre: Vec3 = [center[0], center[1] + yTop, center[2]];
      for (let i = 0; i < segments; i += 1) {
        this.triangle(
          centre,
          ring(rTop, yTop, i + 1),
          ring(rTop, yTop, i),
          cTop,
        );
      }
    }
    return this;
  }

  cylinder(
    center: Vec3,
    radius: number,
    height: number,
    segments: number,
    color: Rgb,
  ): this {
    return this.lathe(
      [
        [radius, 0, color],
        [radius, height, color],
      ],
      segments,
      center,
    );
  }

  cone(
    center: Vec3,
    radius: number,
    height: number,
    segments: number,
    color: Rgb,
  ): this {
    return this.lathe(
      [
        [radius, 0, color],
        [0, height, color],
      ],
      segments,
      center,
    );
  }
}
