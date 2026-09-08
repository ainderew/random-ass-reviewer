import { positionAlongPath, waypointsForIsland } from './wander';

describe('waypointsForIsland', () => {
  it('returns nothing for an empty or one-prop island', () => {
    expect(waypointsForIsland([], 4)).toEqual([]);
    expect(waypointsForIsland([{ x: 0, z: 0 }], 4)).toEqual([]);
  });

  it('never returns more waypoints than asked, or than props', () => {
    const props = Array.from({ length: 10 }, (_, i) => ({
      x: i,
      z: (i * 3) % 5,
    }));
    expect(waypointsForIsland(props, 4)).toHaveLength(4);
    expect(waypointsForIsland(props.slice(0, 3), 6)).toHaveLength(3);
  });
});

describe('positionAlongPath', () => {
  const path = [
    { x: 0, z: 0 },
    { x: 4, z: 0 },
    { x: 4, z: 4 },
  ];

  it('starts at the first waypoint and loops cleanly at t = 1', () => {
    const start = positionAlongPath({ path, t: 0, dwellFraction: 0.3 });
    const end = positionAlongPath({ path, t: 1, dwellFraction: 0.3 });
    expect(start).toMatchObject({ x: 0, z: 0 });
    expect(end).toMatchObject({ x: 0, z: 0 });
  });

  it('dwells for the configured fraction of each leg', () => {
    let dwelling = 0;
    const samples = 1000;
    for (let i = 0; i < samples; i += 1) {
      if (
        positionAlongPath({ path, t: i / samples, dwellFraction: 0.25 })
          .isDwelling
      )
        dwelling += 1;
    }
    expect(dwelling / samples).toBeCloseTo(0.25, 1);
  });

  it('faces the direction of travel, not backward', () => {
    const sample = positionAlongPath({ path, t: 0.1, dwellFraction: 0 });
    // First leg travels +x, so sin(heading) is positive and cos(heading) ~ 0.
    expect(Math.sin(sample.heading)).toBeCloseTo(1, 5);
    expect(Math.abs(Math.cos(sample.heading))).toBeLessThan(1e-6);
  });

  it('stands still on a single-point path', () => {
    expect(
      positionAlongPath({ path: [{ x: 2, z: 3 }], t: 0.5, dwellFraction: 0.5 }),
    ).toEqual({
      x: 2,
      z: 3,
      heading: 0,
      isDwelling: true,
    });
  });
});

describe('wander edge cases', () => {
  it('needs at least two placements and two waypoints', () => {
    expect(waypointsForIsland([{ x: 1, z: 1 }], 4)).toEqual([]);
    expect(
      waypointsForIsland(
        [
          { x: 1, z: 1 },
          { x: 2, z: 2 },
        ],
        1,
      ),
    ).toEqual([]);
  });

  it('never returns more waypoints than placements', () => {
    const points = waypointsForIsland(
      [
        { x: 0, z: 0 },
        { x: 3, z: 0 },
        { x: 3, z: 3 },
      ],
      6,
    );
    expect(points).toHaveLength(3);
  });

  it('dwells in place on an empty or single-point path', () => {
    expect(positionAlongPath({ path: [], t: 0.3, dwellFraction: 0.2 })).toEqual(
      {
        x: 0,
        z: 0,
        heading: 0,
        isDwelling: true,
      },
    );
    expect(
      positionAlongPath({ path: [{ x: 2, z: 5 }], t: 0.3, dwellFraction: 0.2 }),
    ).toMatchObject({ x: 2, z: 5, isDwelling: true });
  });

  it('wraps negative and over-range t onto the loop', () => {
    const path = [
      { x: 0, z: 0 },
      { x: 4, z: 0 },
    ];
    const a = positionAlongPath({ path, t: -0.75, dwellFraction: 0 });
    const b = positionAlongPath({ path, t: 0.25, dwellFraction: 0 });
    const c = positionAlongPath({ path, t: 1.25, dwellFraction: 0 });
    expect(a).toEqual(b);
    expect(c).toEqual(b);
  });

  it('clamps the dwell fraction and stands at the leg end while dwelling', () => {
    const path = [
      { x: 0, z: 0 },
      { x: 4, z: 0 },
    ];
    const sample = positionAlongPath({ path, t: 0.49, dwellFraction: 5 });
    expect(sample.isDwelling).toBe(true);
    expect(sample.x).toBe(4);
    const moving = positionAlongPath({ path, t: 0.02, dwellFraction: 5 });
    expect(moving.isDwelling).toBe(false);
  });
});
