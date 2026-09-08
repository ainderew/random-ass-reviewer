import {
  earnedMilestones,
  isHighGrade,
  MILESTONES,
  newlyEarned,
  nextSteps,
  sceneState,
} from './milestones';

const H = 3_600_000;
const zero = { focusMs: 0, highGrades: 0, cardsRecalled: 0 };

describe('career milestones', () => {
  it('starts with nothing earned and a bedroom in a hoodie', () => {
    expect(earnedMilestones(zero)).toEqual([]);
    expect(sceneState(zero)).toMatchObject({
      room: 'bedroom',
      wardrobe: 'hoodie',
      vehicle: 'none',
      shelves: 0,
    });
    expect(sceneState(zero).items.size).toBe(0);
  });

  it('earns the lamp at half an hour and the coat at five high grades', () => {
    const p = { focusMs: 0.5 * H, highGrades: 5, cardsRecalled: 0 };
    const ids = earnedMilestones(p).map((m) => m.id);
    expect(ids).toEqual(['lamp', 'notebook', 'coat']);
    expect(sceneState(p).wardrobe).toBe('coat');
  });

  it('later milestones on a track replace earlier ones in the scene', () => {
    const p = { focusMs: 100 * H, highGrades: 60, cardsRecalled: 500 };
    expect(sceneState(p)).toMatchObject({
      room: 'office',
      wardrobe: 'coat',
      vehicle: 'nicer-car',
      shelves: 2,
    });
    expect(earnedMilestones(p)).toHaveLength(MILESTONES.length);
  });

  it('reports what a session newly earned', () => {
    const before = { focusMs: 0.9 * H, highGrades: 4, cardsRecalled: 10 };
    const after = { focusMs: 1.4 * H, highGrades: 5, cardsRecalled: 12 };
    expect(newlyEarned(before, after).map((m) => m.id)).toEqual([
      'stethoscope',
      'coat',
    ]);
    expect(newlyEarned(after, after)).toEqual([]);
  });

  it('names the nearest next step on each track in plain words', () => {
    const steps = nextSteps({
      focusMs: 0.75 * H,
      highGrades: 3,
      cardsRecalled: 49,
    });
    expect(steps.map((s) => `${s.milestone.id}: ${s.remaining}`)).toEqual([
      'stethoscope: 15 more focused minutes',
      'coat: 2 more high grades',
      'shelf-1: 1 more card remembered',
    ]);
    const focus = nextSteps({ focusMs: 25 * H, highGrades: 0, cardsRecalled: 0 }).find(
      (s) => s.milestone.requires.focusHours !== undefined,
    );
    expect(focus?.remaining).toBe('15 more focused hours');
  });

  it('draws the pass line at 75 percent', () => {
    expect(isHighGrade(6, 8)).toBe(true);
    expect(isHighGrade(5, 8)).toBe(false);
    expect(isHighGrade(0, 0)).toBe(false);
  });
});
