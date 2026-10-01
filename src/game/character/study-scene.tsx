'use client';

import { DoubleSide } from 'three';
import type { sceneState } from '@/domain/career/milestones';
import { toon, toonMaterial } from './toon';
import {
  AnatomyModel,
  Chair,
  Cushion,
  Desk,
  ExamTable,
  Vehicle,
} from './room-floor';
import { FLOOR, PLATFORM_RADIUS, RIM, WALL, WALL_RADIUS } from './room-kit';
import {
  Bookshelf,
  CoatHook,
  Diploma,
  Poster,
  Stethoscope,
  Window,
} from './room-wall';

export type SceneState = ReturnType<typeof sceneState>;

const walls = {
  bedroom: toonMaterial(WALL.bedroom, DoubleSide),
  clinic: toonMaterial(WALL.clinic, DoubleSide),
  office: toonMaterial(WALL.office, DoubleSide),
};

// A round platform with a curved back wall, seen from the front like a
// diorama: the room the student has earned, with her cat on a cushion at the
// front. The milestones switch the props on.
export const StudyRoom = ({ scene }: { scene: SceneState }) => {
  const has = (id: string) => scene.items.has(id);
  return (
    <group>
      <mesh position={[0, -0.07, 0]} material={toon(FLOOR[scene.room])}>
        <cylinderGeometry args={[PLATFORM_RADIUS, PLATFORM_RADIUS, 0.14, 72]} />
      </mesh>
      <mesh
        position={[0, -0.03, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        material={toon(RIM)}
      >
        <torusGeometry args={[PLATFORM_RADIUS, 0.07, 14, 96]} />
      </mesh>
      {/* The back wall, open toward us, with a rounded top edge. */}
      <mesh position={[0, 0.62, 0]} material={walls[scene.room]}>
        <cylinderGeometry
          args={[
            WALL_RADIUS,
            WALL_RADIUS,
            1.24,
            72,
            1,
            true,
            Math.PI * 0.55,
            Math.PI * 0.9,
          ]}
        />
      </mesh>
      <mesh
        position={[0, 1.24, 0]}
        rotation={[-Math.PI / 2, 0, Math.PI * 0.05]}
        material={toon(RIM)}
      >
        <torusGeometry args={[WALL_RADIUS, 0.04, 10, 72, Math.PI * 0.9]} />
      </mesh>
      <Window />
      <Bookshelf shelves={scene.shelves} scrubs={scene.wardrobe !== 'hoodie'} />
      <Desk
        lampOn={has('lamp')}
        notebook={has('notebook')}
        nameplate={has('nameplate')}
      />
      <Chair />
      {has('poster') ? <Poster /> : null}
      {has('diploma') ? <Diploma /> : null}
      {has('stethoscope') ? <Stethoscope /> : null}
      {scene.wardrobe === 'coat' ? <CoatHook /> : null}
      {scene.room !== 'bedroom' && has('exam-table') ? <ExamTable /> : null}
      {has('skeleton') ? <AnatomyModel /> : null}
      {scene.vehicle !== 'none' ? <Vehicle kind={scene.vehicle} /> : null}
      <Cushion />
    </group>
  );
};
