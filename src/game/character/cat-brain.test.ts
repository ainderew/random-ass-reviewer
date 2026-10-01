import { Group, PerspectiveCamera } from 'three';
import { createCatBrain, type CatBrain, type FxKind } from './cat-brain';
import { createCareStage } from './cat-care';
import { buildCat, type CatRig } from './cat-model';

const FRAME = 1 / 60;

function setup() {
  const rig = buildCat();
  const camera = new PerspectiveCamera(30, 1, 0.1, 30);
  camera.position.set(0, 2.05, 4.3);
  camera.lookAt(0, 0.55, 0);
  camera.updateMatrixWorld();
  const seen: FxKind[] = [];
  const notes: string[] = [];
  const stage = createCareStage();
  // Her seat, as the scene places her.
  const seat = new Group();
  seat.add(rig.root, stage.props);
  const brain = createCatBrain(
    rig,
    camera,
    (kind, _at, _drift, text) => {
      seen.push(kind);
      if (text) notes.push(text);
    },
    stage,
  );
  let t = 0;
  const run = (seconds: number, each?: () => void) => {
    for (let i = 0; i < Math.round(seconds / FRAME); i++) {
      t += FRAME;
      each?.();
      brain.tick(FRAME, t);
      seat.updateMatrixWorld(true);
    }
  };
  run(0.1);
  return { rig, brain, seen, notes, stage, run };
}

const eyes = (rig: CatRig) => {
  const [eye] = rig.eyes;
  if (eye?.closed.visible) return 'closed';
  if (eye?.happy.visible)
    return eye.happy.rotation.z !== 0 ? 'squint' : 'happy';
  return 'open';
};

const pet = (brain: CatBrain, zone: 'head' | 'back' | 'chin') => () =>
  brain.stroke(zone, 4);

describe('the study cat', () => {
  it('chirps with happy eyes and a heart when you tap her', () => {
    const { rig, brain, seen, run } = setup();
    brain.tap('head', 1);
    run(0.2);
    expect(eyes(rig)).toBe('happy');
    expect(seen).toContain('heart');
  });

  it('squints when you boop her nose', () => {
    const { rig, brain, seen, run } = setup();
    brain.tap('nose', 1);
    run(0.3);
    expect(eyes(rig)).toBe('squint');
    expect(seen).toContain('boop');
  });

  it('purrs and lifts her tail while you stroke her back', () => {
    const { rig, brain, seen, run } = setup();
    const tailAtRest = rig.tailTip.position.y;
    run(2, pet(brain, 'back'));
    expect(eyes(rig)).toBe('happy');
    expect(seen).toContain('prr');
    expect(rig.tailTip.position.y).toBeGreaterThan(tailAtRest + 0.2);
  });

  it('tips her head up when you scratch under her chin', () => {
    const { rig, brain, run } = setup();
    run(1.5, pet(brain, 'chin'));
    expect(rig.headPivot.rotation.x).toBeLessThan(-0.2);
  });

  it('yawns and naps after a lot of attention, and still purrs asleep', () => {
    const { rig, brain, seen, run } = setup();
    for (let i = 0; i < 11; i++) brain.tap('head', 1);
    run(4);
    expect(eyes(rig)).toBe('closed');
    seen.length = 0;
    run(2, pet(brain, 'head'));
    expect(eyes(rig)).toBe('closed');
    expect(seen).toEqual(expect.arrayContaining(['z', 'prr']));
  });

  it('looks away while you are away and greets you when you are back', () => {
    const { rig, brain, seen, run } = setup();
    brain.setMood('away');
    run(1.5);
    expect(rig.headPivot.rotation.y).toBeLessThan(-0.5);
    seen.length = 0;
    brain.setMood('studying');
    run(0.2);
    expect(seen).toContain('heart');
  });

  it('sleeps through a break', () => {
    const { rig, brain, run } = setup();
    brain.setMood('resting');
    run(0.5);
    expect(eyes(rig)).toBe('closed');
  });

  it('still reacts under reduced motion, without anything floating up', () => {
    const { rig, brain, seen, run } = setup();
    brain.setReduced(true);
    brain.tap('head', 1);
    run(0.1);
    expect(eyes(rig)).toBe('happy');
    expect(seen).toEqual([]);
  });

  it('eats from a bowl, then shows what the meal added', () => {
    const { rig, brain, seen, notes, stage, run } = setup();
    brain.care('eat', null, '+100 g');
    run(1.5);
    expect(stage.props.children.some((c) => c.visible)).toBe(true);
    expect(eyes(rig)).toBe('happy');
    expect(rig.headPivot.rotation.x).toBeGreaterThan(0.3);
    run(2.3);
    expect(seen).toContain('nom');
    expect(notes).toEqual(['+100 g']);
    expect(stage.props.children.every((c) => !c.visible)).toBe(true);
  });

  it('catches a treat with a heart', () => {
    const { brain, seen, run } = setup();
    brain.care('treat', null);
    run(1.4);
    expect(seen.filter((k) => k === 'heart').length).toBeGreaterThanOrEqual(2);
  });

  it('purrs and sparkles under the brush', () => {
    const { brain, seen, run } = setup();
    brain.care('brush', null);
    run(3);
    expect(seen).toEqual(expect.arrayContaining(['spark', 'prr']));
  });

  it('plays with a toy for a while, ignoring taps, then lets it go', () => {
    const { brain, seen, run } = setup();
    brain.care('play', 'mouse');
    run(1);
    expect(brain.playing()).toBe(true);
    seen.length = 0;
    brain.tap('nose', 1);
    run(0.2);
    expect(seen).not.toContain('boop');
    run(9);
    expect(brain.playing()).toBe(false);
  });

  it('gets visibly rounder as she is fed', () => {
    const { rig, brain, run } = setup();
    brain.setLook({ round: 1, feeling: 'happy' });
    run(0.5);
    expect(rig.torso.scale.x).toBeGreaterThan(1.3);
    expect(rig.hind[1].position.x).toBeGreaterThan(0.4);
  });

  it('droops when she is sad: ears back, head low', () => {
    const { rig, brain, run } = setup();
    brain.setLook({ round: 0, feeling: 'happy' });
    run(1);
    const happyEar = rig.ears[0].rotation.z;
    brain.setLook({ round: 0, feeling: 'sad' });
    run(1.5);
    expect(rig.ears[0].rotation.z).toBeGreaterThan(happyEar + 0.15);
    expect(rig.headPivot.rotation.x).toBeGreaterThan(0.1);
  });
});
