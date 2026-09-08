import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { localHourOfDay } from '@/domain/time/local-day';
import { skyPaletteFor, sunPositionForLocalTime } from '@/domain/world/sun';
import { windUniforms } from '@/game/materials/wind-material';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { worldState } from './world-state';

// The one place that knows what time it is. Runs before every other
// useFrame (negative priority) so consumers read a finished frame state.
export const WorldClock = ({
  timeZone,
  wind = true,
}: {
  timeZone: string;
  wind?: boolean;
}) => {
  const reducedMotion = useReducedMotion();
  const lastSample = useRef(-10);

  useFrame((_, delta) => {
    const dt = worldState.frozen ? 0 : Math.min(delta, 0.1);
    worldState.elapsed += dt;
    worldState.reducedMotion = reducedMotion;
    if (!reducedMotion) worldState.windPhase += dt;
    windUniforms.uTime.value = worldState.windPhase;
    windUniforms.uGlobalAmplitude.value = reducedMotion || !wind ? 0 : 1;

    // The real clock moves slowly; once a second is plenty.
    if (worldState.elapsed - lastSample.current < 1) return;
    lastSample.current = worldState.elapsed;
    const hour =
      worldState.hourOverride ?? localHourOfDay(Date.now(), timeZone);
    const sun = sunPositionForLocalTime({ localHour: hour });
    worldState.localHour = hour;
    worldState.sunAltitude = sun.altitude;
    worldState.sunAzimuth = sun.azimuth;
    worldState.dayFactor = sun.dayFactor;
    worldState.palette = skyPaletteFor(sun.dayFactor, hour);
  }, -10);

  return null;
};
