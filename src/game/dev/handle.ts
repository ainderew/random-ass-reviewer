import { windUniforms } from '@/game/materials/wind-material';
import { useIslandStore } from '@/game/store/island-store';
import { worldState } from '@/game/systems/world-state';

// Development only: a console handle for poking the live scene.
export const devHandle: Record<string, unknown> = {
  worldState,
  windUniforms,
  useIslandStore,
};

export function exposeDevHandle(): void {
  if (process.env.NODE_ENV !== 'development' || typeof window === 'undefined')
    return;
  (window as unknown as { __aloft: unknown }).__aloft = devHandle;
}
