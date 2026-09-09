'use client';

import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  AnimationMixer,
  Box3,
  Euler,
  Group,
  Quaternion,
  Vector3,
  type Bone,
  type Object3D,
  type SkinnedMesh,
} from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

export const CHARACTER_URL = '/characters/whisker-scholar.glb';
export type CharacterMood = 'studying' | 'away' | 'resting';

const DEG = Math.PI / 180;
type Pose = Record<string, readonly [number, number, number]>;

// Local rotations in degrees, applied on top of each bone's rest pose. The
// rig is Meshy's biped: a T-pose with the legs straight down.
// Found by hand in the page: x drops an arm along the body, z swings it
// forward, and the same z bends the elbow.
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

const scratchEuler = new Euler();
const scratchQuat = new Quaternion();

function collectBones(root: Object3D): Map<string, Bone> {
  const bones = new Map<string, Bone>();
  root.traverse((object) => {
    if ((object as Bone).isBone) bones.set(object.name, object as Bone);
  });
  return bones;
}

// She sits at the desk and works. Studying: breathing, a nod now and then, the
// writing hand moving. Resting: leaning back, slower breath. Away: up and
// pacing, which is the one clip the export carries, played in place.
export const WhiskerScholar = ({
  mood,
  reducedMotion,
}: {
  mood: CharacterMood;
  reducedMotion: boolean;
}) => {
  const gltf = useGLTF(CHARACTER_URL, false, true);
  const group = useRef<Group>(null);
  const clock = useRef(0);
  const invalidate = useThree((state) => state.invalidate);

  const { model, bones, rest, mixer, fit } = useMemo(() => {
    const model = cloneSkeleton(gltf.scene);
    const bones = collectBones(model);
    const rest = new Map<string, Quaternion>();
    for (const [name, bone] of bones) rest.set(name, bone.quaternion.clone());
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
    return { model, bones, rest, mixer, fit };
  }, [gltf]);

  const applyPose = (pose: Pose, t: number, moving: boolean) => {
    for (const [name, bone] of bones) {
      const base = rest.get(name);
      if (!base) continue;
      const delta = pose[name] ?? ([0, 0, 0] as const);
      let [x, y, z] = delta;
      if (moving) {
        const breath = Math.sin(t * 1.4) * 1.6;
        if (name === 'Spine' || name === 'Spine01') x += breath;
        if (name === 'Head' && pose === SEATED) {
          x += Math.sin(t * 0.55) * 3 + Math.sin(t * 2.3) * 0.6;
          y += Math.sin(t * 0.37) * 5;
        }
        if (name === 'RightForeArm' && pose === SEATED) {
          z += Math.sin(t * 6) * 5;
          x += Math.cos(t * 6) * 3;
        }
      }
      scratchEuler.set(x * DEG, y * DEG, z * DEG, 'XYZ');
      scratchQuat.setFromEuler(scratchEuler);
      bone.quaternion.copy(base).multiply(scratchQuat);
    }
  };

  useEffect(() => {
    const clip = gltf.animations[0];
    if (mood === 'away' && clip) {
      const action = mixer.clipAction(clip);
      action
        .reset()
        .setEffectiveTimeScale(reducedMotion ? 0 : 0.7)
        .play();
      return () => {
        action.stop();
      };
    }
    // Back at the desk: one pose is enough; the frame loop keeps it moving.
    applyPose(mood === 'resting' ? RESTING : SEATED, 0, false);
    invalidate();
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood, reducedMotion, mixer, gltf]);

  useFrame((_, delta) => {
    clock.current += delta;
    if (mood === 'away') {
      mixer.update(delta);
      const hips = bones.get('Hips');
      if (hips) hips.position.x = 0;
      return;
    }
    if (reducedMotion) return;
    applyPose(mood === 'resting' ? RESTING : SEATED, clock.current, true);
  });

  return (
    <group ref={group} rotation={[0, mood === 'away' ? -0.2 : -0.7, 0]}>
      <primitive
        object={model}
        scale={fit.scale}
        position={fit.offset.toArray()}
      />
    </group>
  );
};

useGLTF.preload(CHARACTER_URL, false, true);
