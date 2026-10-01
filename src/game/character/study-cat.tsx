'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, type RefObject } from 'react';
import { createCatBrain, type CatMood, type Feeling } from './cat-brain';
import { createCareStage, type CareKind, type ToyKind } from './cat-care';
import type { CoatName } from './cat-coats';
import { emitFx } from './cat-fx';
import { buildCat } from './cat-model';
import { attachCatTouch } from './cat-touch';
import { CUSHION_AT } from './room-floor';

// She sits on the cushion at the front, a little smaller than the prototype
// so the room still shows round her.
const SCALE = 0.85;
const SEAT: [number, number, number] = [CUSHION_AT[0], 0.13, CUSHION_AT[2]];

// How she looks, from the server's view of her: how round, how she feels,
// and her coat.
export interface CatLook {
  round: number;
  feeling: Feeling;
  coat: CoatName;
}

// One act of care to play out. A new id plays it again.
export interface CareCue {
  id: number;
  kind: CareKind;
  toy: ToyKind | null;
  // Shown after a meal, like "+100 g".
  note?: string;
}

export const DEFAULT_LOOK: CatLook = {
  round: 0,
  feeling: 'happy',
  coat: 'ginger',
};

export const StudyCat = ({
  mood,
  reducedMotion,
  fxLayer,
  look = DEFAULT_LOOK,
  cue = null,
}: {
  mood: CatMood;
  reducedMotion: boolean;
  fxLayer: RefObject<HTMLDivElement | null>;
  look?: CatLook;
  cue?: CareCue | null;
}) => {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  const rig = useMemo(() => buildCat(), []);
  const stage = useMemo(() => createCareStage(), []);
  const brain = useMemo(
    () =>
      createCatBrain(
        rig,
        camera,
        (kind, at, drift, text) => {
          const layer = fxLayer.current;
          if (layer) emitFx(layer, camera, kind, at, drift, text);
        },
        stage,
      ),
    [rig, camera, fxLayer, stage],
  );

  useEffect(() => {
    brain.setReduced(reducedMotion);
    invalidate();
  }, [brain, reducedMotion, invalidate]);

  useEffect(() => {
    brain.setMood(mood);
    invalidate();
  }, [brain, mood, invalidate]);

  const { round, feeling, coat } = look;
  useEffect(() => {
    brain.setLook({ round, feeling });
    rig.coat(coat);
    invalidate();
  }, [brain, rig, round, feeling, coat, invalidate]);

  const cueId = cue?.id;
  useEffect(() => {
    if (!cue) return;
    brain.care(cue.kind, cue.toy, cue.note);
    invalidate();
    // Only a new cue plays; the rest of it rides along.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brain, cueId, invalidate]);

  useEffect(
    () => attachCatTouch(gl.domElement, camera, rig, brain, invalidate),
    [gl, camera, rig, brain, invalidate],
  );

  // Under reduced motion the canvas draws on demand: keep asking for frames
  // only while she is in the middle of something.
  useFrame((state, delta) => {
    const busy = brain.tick(Math.min(delta, 0.1), state.clock.elapsedTime);
    if (reducedMotion && busy) invalidate();
  });

  return (
    <group position={SEAT} scale={SCALE}>
      <primitive object={rig.root} />
      <primitive object={stage.props} />
    </group>
  );
};
