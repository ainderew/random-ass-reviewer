'use client';

import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  AnimationMixer,
  Box3,
  Euler,
  Group,
  MathUtils,
  Quaternion,
  Vector3,
  type AnimationAction,
  type Bone,
  type Object3D,
  type SkinnedMesh,
} from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { SPOTS, type SpotName } from './study-scene';

export const CHARACTER_URL = '/characters/whisker-scholar.glb';
export type CharacterMood = 'wandering' | 'studying' | 'away' | 'resting';

const DEG = Math.PI / 180;
type Pose = Record<string, readonly [number, number, number]>;

// Local rotations in degrees on top of each bone's rest pose (a T-pose with
// the legs straight down). Found by hand in the page: x drops an arm along
// the body, z swings it forward, and the same z bends the elbow.
const SEATED: Pose = {
  LeftUpLeg: [-80, 0, 0],
  RightUpLeg: [-80, 0, 0],
  LeftLeg: [85, 0, 0],
  RightLeg: [85, 0, 0],
  LeftArm: [50, 0, 40],
  RightArm: [50, 0, 40],
  LeftForeArm: [0, 0, 45],
  RightForeArm: [0, 0, 45],
  Spine02: [12, 0, 0],
  Head: [22, 0, 0],
};
const RESTING: Pose = {
  ...SEATED,
  Spine02: [-10, 0, 0],
  Head: [-2, 0, 0],
  LeftArm: [60, 0, 15],
  RightArm: [60, 0, 15],
  LeftForeArm: [0, 0, 25],
  RightForeArm: [0, 0, 25],
};
const STANDING: Pose = {
  LeftArm: [78, 0, 6],
  RightArm: [78, 0, 6],
  LeftForeArm: [0, 0, 12],
  RightForeArm: [0, 0, 12],
};
const READING: Pose = {
  LeftArm: [62, 0, 24],
  RightArm: [62, 0, 24],
  LeftForeArm: [0, 0, 100],
  RightForeArm: [0, 0, 100],
  Head: [20, 0, 0],
};
const WAITING: Pose = { ...STANDING, Head: [-4, 0, 0] };

// How far she drops when she sits: chair height against her standing hips.
const SEAT_DROP = 0.18;
const WALK_SPEED = 0.42;
const TURN_RATE = 7;
const POSE_RATE = 7;

interface Step {
  spot: SpotName;
  pose: Pose;
  seconds: number;
  seated?: boolean;
  // Overrides the spot's facing once she arrives.
  facing?: number;
}

// What she does in each mood. Wandering is the idle screen: she moves around
// the room she has earned. Studying is the desk, with a walk to the shelf now
// and then so a long session is not a statue. Away, she stands and waits.
function planFor(mood: CharacterMood): Step[] {
  switch (mood) {
    case 'wandering':
      return [
        { spot: 'shelf', pose: READING, seconds: 4.5 },
        { spot: 'window', pose: STANDING, seconds: 3 },
        { spot: 'desk', pose: SEATED, seconds: 7, seated: true },
        { spot: 'front', pose: STANDING, seconds: 2.5 },
      ];
    case 'studying':
      return [
        {
          spot: 'desk',
          pose: SEATED,
          seconds: 90 + Math.random() * 60,
          seated: true,
        },
        { spot: 'shelf', pose: READING, seconds: 5 },
      ];
    case 'away':
      return [{ spot: 'desk', pose: WAITING, seconds: 3600, facing: 0.1 }];
    case 'resting':
      return [{ spot: 'desk', pose: RESTING, seconds: 3600, seated: true }];
  }
}

const scratchEuler = new Euler();
const scratchQuat = new Quaternion();
const scratchDir = new Vector3();

function collectBones(root: Object3D): Map<string, Bone> {
  const bones = new Map<string, Bone>();
  root.traverse((object) => {
    if ((object as Bone).isBone) bones.set(object.name, object as Bone);
  });
  return bones;
}

function lerpAngle(from: number, to: number, t: number): number {
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + delta * t;
}

interface Runtime {
  plan: Step[];
  index: number;
  phase: 'walking' | 'holding';
  holdLeft: number;
  position: Vector3;
  heading: number;
  seatDrop: number;
  pose: Map<string, [number, number, number]>;
  clock: number;
}

export const WhiskerScholar = ({
  mood,
  reducedMotion,
}: {
  mood: CharacterMood;
  reducedMotion: boolean;
}) => {
  const gltf = useGLTF(CHARACTER_URL, false, true);
  const group = useRef<Group>(null);
  const invalidate = useThree((state) => state.invalidate);

  const { model, bones, rest, restPosition, mixer, walk, fit } = useMemo(() => {
    const model = cloneSkeleton(gltf.scene);
    const bones = collectBones(model);
    const rest = new Map<string, Quaternion>();
    const restPosition = new Map<string, Vector3>();
    for (const [name, bone] of bones) {
      rest.set(name, bone.quaternion.clone());
      restPosition.set(name, bone.position.clone());
    }
    // Bounds in the bind pose. The optimiser quantises positions to a unit
    // cube and keeps the real size in the inverse bind matrices, so the raw
    // geometry box means nothing; the skinned box does, once the skeleton
    // has been updated by hand (the renderer only does that when it draws).
    model.updateMatrixWorld(true);
    const box = new Box3();
    model.traverse((object) => {
      const mesh = object as SkinnedMesh;
      if (!mesh.isMesh) return;
      mesh.frustumCulled = false;
      if (mesh.isSkinnedMesh) {
        mesh.skeleton.update();
        mesh.computeBoundingBox();
      } else {
        mesh.geometry.computeBoundingBox();
      }
      const local = mesh.isSkinnedMesh
        ? mesh.boundingBox
        : mesh.geometry.boundingBox;
      if (local) box.union(local.clone().applyMatrix4(mesh.matrixWorld));
    });
    const size = new Vector3();
    box.getSize(size);
    const scale = size.y > 0 ? 1 / size.y : 1;
    const fit = {
      scale,
      offset: new Vector3(
        -(box.min.x + size.x / 2) * scale,
        -box.min.y * scale,
        -(box.min.z + size.z / 2) * scale,
      ),
    };
    const mixer = new AnimationMixer(model);
    const clip = gltf.animations[0];
    const walk: AnimationAction | null = clip ? mixer.clipAction(clip) : null;
    walk?.setEffectiveTimeScale(1.15);
    return { model, bones, rest, restPosition, mixer, walk, fit };
  }, [gltf]);

  const runtime = useRef<Runtime>({
    plan: planFor(mood),
    index: 0,
    phase: 'holding',
    holdLeft: 0,
    position: new Vector3(...SPOTS[planFor(mood)[0]!.spot].position),
    heading: 0,
    seatDrop: 0,
    pose: new Map(),
    clock: 0,
  });

  const setBones = (
    pose: Map<string, [number, number, number]>,
    t: number,
    step: Step,
    moving: boolean,
  ) => {
    for (const [name, bone] of bones) {
      const base = rest.get(name);
      if (!base) continue;
      let [x, y, z] = pose.get(name) ?? [0, 0, 0];
      if (moving) {
        const breath = Math.sin(t * 1.4) * 1.6;
        if (name === 'Spine' || name === 'Spine01') x += breath;
        if (name === 'Head' && step.pose === SEATED) {
          x += Math.sin(t * 0.55) * 3 + Math.sin(t * 2.3) * 0.6;
          y += Math.sin(t * 0.37) * 5;
        }
        if (name === 'RightForeArm' && step.pose === SEATED) {
          z += Math.sin(t * 6) * 5;
          x += Math.cos(t * 6) * 3;
        }
        if (name === 'LeftForeArm' && step.pose === READING) {
          z += Math.max(0, Math.sin(t * 1.1)) * 12;
        }
        if (name === 'Head' && step.pose === WAITING) {
          y += Math.sin(t * 0.5) * 8;
        }
      }
      scratchEuler.set(x * DEG, y * DEG, z * DEG, 'XYZ');
      scratchQuat.setFromEuler(scratchEuler);
      bone.quaternion.copy(base).multiply(scratchQuat);
      const home = restPosition.get(name);
      if (home) bone.position.copy(home);
    }
  };

  // One tick of her plan. `snap` lands everything at once (first frame,
  // reduced motion); otherwise she walks, turns, and eases into each pose.
  const tick = (dt: number, snap: boolean) => {
    const r = runtime.current;
    const step = r.plan[r.index]!;
    const spot = SPOTS[step.spot];
    const target = scratchDir.set(...spot.position);
    r.clock += dt;

    if (snap) {
      r.position.copy(target);
      r.phase = 'holding';
      r.holdLeft = step.seconds;
      r.heading = step.facing ?? spot.facing;
      r.seatDrop = step.seated ? SEAT_DROP : 0;
      for (const name of bones.keys())
        r.pose.set(name, [...(step.pose[name] ?? [0, 0, 0])]);
      walk?.stop();
      setBones(r.pose, r.clock, step, false);
    } else if (r.phase === 'walking') {
      const toGo = target.clone().sub(r.position);
      toGo.y = 0;
      const distance = toGo.length();
      if (distance < 0.04) {
        r.position.copy(target);
        r.phase = 'holding';
        r.holdLeft = step.seconds;
        walk?.stop();
        for (const name of bones.keys())
          r.pose.set(name, [...(STANDING[name] ?? [0, 0, 0])]);
      } else {
        const stepLength = Math.min(distance, WALK_SPEED * dt);
        r.heading = lerpAngle(
          r.heading,
          Math.atan2(toGo.x, toGo.z),
          Math.min(1, dt * TURN_RATE),
        );
        r.position.addScaledVector(toGo.normalize(), stepLength);
        mixer.update(dt);
        const hips = bones.get('Hips');
        if (hips) {
          hips.position.x = 0;
          hips.position.z = restPosition.get('Hips')?.z ?? 0;
        }
      }
      r.seatDrop = MathUtils.lerp(r.seatDrop, 0, Math.min(1, dt * POSE_RATE));
    } else {
      r.holdLeft -= dt;
      r.heading = lerpAngle(
        r.heading,
        step.facing ?? spot.facing,
        Math.min(1, dt * TURN_RATE),
      );
      r.seatDrop = MathUtils.lerp(
        r.seatDrop,
        step.seated ? SEAT_DROP : 0,
        Math.min(1, dt * POSE_RATE),
      );
      const k = Math.min(1, dt * POSE_RATE);
      for (const name of bones.keys()) {
        const want = step.pose[name] ?? [0, 0, 0];
        const have = r.pose.get(name) ?? [0, 0, 0];
        r.pose.set(name, [
          MathUtils.lerp(have[0], want[0], k),
          MathUtils.lerp(have[1], want[1], k),
          MathUtils.lerp(have[2], want[2], k),
        ]);
      }
      setBones(r.pose, r.clock, step, true);
      if (r.holdLeft <= 0) {
        r.index = (r.index + 1) % r.plan.length;
        const next = r.plan[r.index]!;
        const away = scratchDir
          .set(...SPOTS[next.spot].position)
          .sub(r.position);
        away.y = 0;
        if (away.length() > 0.05) {
          r.phase = 'walking';
          walk?.reset().play();
        } else {
          r.holdLeft = next.seconds;
        }
      }
    }

    const g = group.current;
    if (g) {
      g.position.set(r.position.x, r.position.y - r.seatDrop, r.position.z);
      g.rotation.y = r.heading;
    }
  };

  useEffect(() => {
    const r = runtime.current;
    r.plan = planFor(mood);
    r.index = 0;
    const first = r.plan[0]!;
    const there = scratchDir.set(...SPOTS[first.spot].position).sub(r.position);
    there.y = 0;
    if (reducedMotion || there.length() < 0.05) {
      tick(0, true);
    } else {
      r.phase = 'walking';
      walk?.reset().play();
    }
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood, reducedMotion, walk]);

  useFrame((_, delta) => {
    if (reducedMotion) return;
    tick(Math.min(delta, 0.1), false);
  });

  return (
    <group ref={group}>
      <primitive
        object={model}
        scale={fit.scale}
        position={fit.offset.toArray()}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
        <circleGeometry args={[0.2, 24]} />
        <meshBasicMaterial color="#0b0d14" transparent opacity={0.4} />
      </mesh>
    </group>
  );
};

useGLTF.preload(CHARACTER_URL, false, true);
