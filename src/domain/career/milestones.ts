// Her road to the white coat, drawn on the study tab. Every milestone is
// earned by real work the server already counts: focused hours, quizzes
// passed with a high grade, cards remembered. Nothing here is bought.

export type MilestoneKind = 'item' | 'wardrobe' | 'room' | 'vehicle' | 'shelf';

export type RoomStage = 'bedroom' | 'clinic' | 'office';
export type Wardrobe = 'hoodie' | 'scrubs' | 'coat';
export type Vehicle = 'none' | 'bicycle' | 'car' | 'nicer-car';

export interface Requirement {
  focusHours?: number;
  highGrades?: number;
  cardsRecalled?: number;
}

export interface Milestone {
  id: string;
  kind: MilestoneKind;
  label: string;
  // What the reveal says. Kind tutor voice: named, specific, no exclamation.
  line: string;
  requires: Requirement;
}

const HOUR = 3_600_000;

export const MILESTONES: readonly Milestone[] = [
  {
    id: 'lamp',
    kind: 'item',
    label: 'Desk lamp',
    line: 'The lamp is on. Half an hour of real focus lit it.',
    requires: { focusHours: 0.5 },
  },
  {
    id: 'notebook',
    kind: 'item',
    label: 'Notebook',
    line: 'A notebook on the desk. Your first high grade filled its first page.',
    requires: { highGrades: 1 },
  },
  {
    id: 'stethoscope',
    kind: 'item',
    label: 'Stethoscope',
    line: 'A stethoscope on the hook. One focused hour, all told.',
    requires: { focusHours: 1 },
  },
  {
    id: 'poster',
    kind: 'item',
    label: 'Anatomy poster',
    line: 'An anatomy poster on the wall, after three focused hours.',
    requires: { focusHours: 3 },
  },
  {
    id: 'coat',
    kind: 'wardrobe',
    label: 'White coat',
    line: 'The white coat. Five quizzes at a high grade earned it.',
    requires: { highGrades: 5 },
  },
  {
    id: 'scrubs',
    kind: 'wardrobe',
    label: 'Scrubs',
    line: 'Scrubs, after six focused hours. Comfortable, and hers.',
    requires: { focusHours: 6 },
  },
  {
    id: 'shelf-1',
    kind: 'shelf',
    label: 'A full shelf',
    line: 'Fifty cards remembered fill the first shelf.',
    requires: { cardsRecalled: 50 },
  },
  {
    id: 'clinic',
    kind: 'room',
    label: 'The clinic',
    line: 'Ten high grades. The desk is now in a clinic.',
    requires: { highGrades: 10 },
  },
  {
    id: 'skeleton',
    kind: 'item',
    label: 'Skeleton model',
    line: 'A skeleton model by the desk, at ten focused hours.',
    requires: { focusHours: 10 },
  },
  {
    id: 'exam-table',
    kind: 'item',
    label: 'Exam table',
    line: 'An exam table and a blood pressure cuff, at fifteen high grades.',
    requires: { highGrades: 15 },
  },
  {
    id: 'bicycle',
    kind: 'vehicle',
    label: 'Bicycle',
    line: 'A bicycle outside the window, after twenty focused hours.',
    requires: { focusHours: 20 },
  },
  {
    id: 'diploma',
    kind: 'item',
    label: 'Framed diploma',
    line: 'A framed diploma on the wall. Twenty high grades.',
    requires: { highGrades: 20 },
  },
  {
    id: 'shelf-2',
    kind: 'shelf',
    label: 'Second shelf',
    line: 'Two hundred cards remembered. The second shelf is full.',
    requires: { cardsRecalled: 200 },
  },
  {
    id: 'office',
    kind: 'room',
    label: 'Her own office',
    line: 'Thirty high grades. Her own office, with her name on the door.',
    requires: { highGrades: 30 },
  },
  {
    id: 'car',
    kind: 'vehicle',
    label: 'A car',
    line: 'A car outside, after forty focused hours.',
    requires: { focusHours: 40 },
  },
  {
    id: 'nameplate',
    kind: 'item',
    label: 'Dr. nameplate',
    line: 'Fifty high grades. The nameplate on the desk says Dr.',
    requires: { highGrades: 50 },
  },
  {
    id: 'nicer-car',
    kind: 'vehicle',
    label: 'A nicer car',
    line: 'A nicer car outside. Eighty focused hours, which is a lot of hours.',
    requires: { focusHours: 80 },
  },
];

export interface CareerProgress {
  // Lifetime credited focus, in milliseconds.
  focusMs: number;
  // Quizzes finished at 75% or better.
  highGrades: number;
  // Reviews rated Good or Easy, lifetime.
  cardsRecalled: number;
}

export function isEarned(m: Milestone, p: CareerProgress): boolean {
  const r = m.requires;
  if (r.focusHours !== undefined && p.focusMs < r.focusHours * HOUR)
    return false;
  if (r.highGrades !== undefined && p.highGrades < r.highGrades) return false;
  if (r.cardsRecalled !== undefined && p.cardsRecalled < r.cardsRecalled)
    return false;
  return true;
}

export function earnedMilestones(p: CareerProgress): Milestone[] {
  return MILESTONES.filter((m) => isEarned(m, p));
}

// Milestones earned after `before` that were not earned before it.
export function newlyEarned(
  before: CareerProgress,
  after: CareerProgress,
): Milestone[] {
  return MILESTONES.filter((m) => !isEarned(m, before) && isEarned(m, after));
}

export interface NextStep {
  milestone: Milestone;
  // Plain sentence: what is left to do.
  remaining: string;
}

// The nearest unearned milestone on each track, so the screen can say
// "White coat: 2 more high grades" without doing arithmetic in the view.
export function nextSteps(p: CareerProgress): NextStep[] {
  const out: NextStep[] = [];
  const seen = new Set<string>();
  for (const m of MILESTONES) {
    if (isEarned(m, p)) continue;
    const r = m.requires;
    const track =
      r.focusHours !== undefined
        ? 'focus'
        : r.highGrades !== undefined
          ? 'grades'
          : 'cards';
    if (seen.has(track)) continue;
    seen.add(track);
    let remaining: string;
    if (r.focusHours !== undefined) {
      const minutes = Math.ceil((r.focusHours * HOUR - p.focusMs) / 60_000);
      remaining =
        minutes >= 90
          ? `${Math.ceil(minutes / 60)} more focused hours`
          : `${minutes} more focused minutes`;
    } else if (r.highGrades !== undefined) {
      const n = r.highGrades - p.highGrades;
      remaining = `${n} more high ${n === 1 ? 'grade' : 'grades'}`;
    } else {
      const n = (r.cardsRecalled ?? 0) - p.cardsRecalled;
      remaining = `${n} more ${n === 1 ? 'card' : 'cards'} remembered`;
    }
    out.push({ milestone: m, remaining });
  }
  return out;
}

export interface SceneState {
  room: RoomStage;
  wardrobe: Wardrobe;
  vehicle: Vehicle;
  items: Set<string>;
  shelves: 0 | 1 | 2;
}

// What the scene draws. Later milestones on a track replace earlier ones.
export function sceneState(p: CareerProgress): SceneState {
  const earned = new Set(earnedMilestones(p).map((m) => m.id));
  return {
    room: earned.has('office')
      ? 'office'
      : earned.has('clinic')
        ? 'clinic'
        : 'bedroom',
    wardrobe: earned.has('coat')
      ? 'coat'
      : earned.has('scrubs')
        ? 'scrubs'
        : 'hoodie',
    vehicle: earned.has('nicer-car')
      ? 'nicer-car'
      : earned.has('car')
        ? 'car'
        : earned.has('bicycle')
          ? 'bicycle'
          : 'none',
    items: new Set(
      MILESTONES.filter((m) => m.kind === 'item' && earned.has(m.id)).map(
        (m) => m.id,
      ),
    ),
    shelves: earned.has('shelf-2') ? 2 : earned.has('shelf-1') ? 1 : 0,
  };
}

// A high grade is the quiz's own pass line.
export const HIGH_GRADE_RATIO = 0.75;
export function isHighGrade(correct: number, total: number): boolean {
  return total > 0 && correct / total >= HIGH_GRADE_RATIO;
}
