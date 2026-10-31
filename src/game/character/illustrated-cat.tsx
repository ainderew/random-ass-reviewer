'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { StudySceneCanvasProps } from './study-scene-canvas';
import { CARE_SECONDS } from './cat-care-goal';
import styles from './illustrated-cat.module.css';
import { illustratedActivity } from './illustrated-routine';

const ASSETS = '/assets/study-cat/';
const CARE_LABEL = {
  eat: 'Enjoying a meal',
  treat: 'Thank you for the treat',
  brush: 'That feels lovely',
  play: 'Ready to play',
};

// Default illustrated companion. The earned 3D room remains available
// with ?cat=3d; care cues here use expression and text feedback.
export function IllustratedCat({
  mood,
  reducedMotion,
  cue,
}: StudySceneCanvasProps) {
  const [petting, setPetting] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [finishedCue, setFinishedCue] = useState<number | null>(null);
  const petTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const head = useRef<HTMLButtonElement>(null);
  const pressed = useRef(false);
  const activeCue = cue && cue.id !== finishedCue ? cue : null;
  const happy = petting || (activeCue !== null && activeCue.kind !== 'play');
  const activity =
    happy || activeCue
      ? 'idle'
      : reducedMotion
        ? mood === 'resting'
          ? 'doze'
          : 'idle'
        : illustratedActivity(seconds, mood);
  const asleep =
    !happy && !activeCue && (mood === 'resting' || activity === 'doze');

  useEffect(() => {
    const visibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, []);

  useEffect(() => {
    if (reducedMotion || happy || activeCue || mood === 'resting') return;
    const timer = setInterval(() => {
      if (!document.hidden) setSeconds((value) => value + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [reducedMotion, happy, activeCue, mood]);

  useEffect(() => {
    if (!cue) return;
    const timer = setTimeout(
      () => setFinishedCue(cue.id),
      CARE_SECONDS[cue.kind] * 1000,
    );
    return () => clearTimeout(timer);
  }, [cue]);
  useEffect(
    () => () => {
      if (petTimer.current) clearTimeout(petTimer.current);
    },
    [],
  );

  function pet() {
    setPetting(true);
    setSeconds(0);
    if (petTimer.current) clearTimeout(petTimer.current);
    petTimer.current = setTimeout(() => setPetting(false), 1600);
  }
  function resetLook() {
    head.current?.style.setProperty('--tilt', '0deg');
    head.current?.style.setProperty('--look-x', '0px');
    head.current?.style.setProperty('--look-y', '0px');
  }

  return (
    <div
      className={styles.scene}
      data-reduced={reducedMotion}
      data-happy={happy}
      data-asleep={asleep}
      data-writing={activity === 'write'}
      data-activity={activity}
      data-hidden={hidden}
      data-care={activeCue?.kind ?? ''}
    >
      {/* Plain images keep alpha layers aligned and avoid separately lazy-loading expressions. */}
      {/* eslint-disable @next/next/no-img-element */}
      <img
        className={styles.background}
        src={`${ASSETS}desk.webp`}
        alt=""
        draggable={false}
      />
      <div className={styles.body}>
        <img src={`${ASSETS}body.webp`} alt="" draggable={false} />
      </div>
      <button
        ref={head}
        type="button"
        className={styles.head}
        aria-label="Pet the study cat"
        onClick={pet}
        onPointerDown={(event) => {
          pressed.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          pet();
        }}
        onPointerUp={() => {
          pressed.current = false;
        }}
        onPointerCancel={() => {
          pressed.current = false;
          resetLook();
        }}
        onLostPointerCapture={() => {
          pressed.current = false;
        }}
        onPointerLeave={resetLook}
        onPointerMove={(event) => {
          if (pressed.current) pet();
          if (reducedMotion || asleep) return;
          const box = event.currentTarget.getBoundingClientRect();
          const x = Math.max(
            -1,
            Math.min(1, ((event.clientX - box.left) / box.width) * 2 - 1),
          );
          const y = Math.max(
            -1,
            Math.min(1, ((event.clientY - box.top) / box.height) * 2 - 1),
          );
          event.currentTarget.style.setProperty('--tilt', `${x * 2.5}deg`);
          event.currentTarget.style.setProperty('--look-x', `${x * 2}px`);
          event.currentTarget.style.setProperty('--look-y', `${y}px`);
        }}
      >
        <span className={styles.gesture}>
          <span className={styles.face}>
            <img
              className={styles.open}
              src={`${ASSETS}head.webp`}
              alt=""
              draggable={false}
            />
            <img
              className={styles.closed}
              src={`${ASSETS}happy.webp`}
              alt=""
              draggable={false}
            />
          </span>
        </span>
      </button>
      <div className={styles.paw}>
        <img src={`${ASSETS}paw.webp`} alt="" draggable={false} />
      </div>
      {happy && (
        <span className={styles.heart} aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 21C8 17 2 13 2 7a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 6-6 10-10 14Z" />
          </svg>
        </span>
      )}
      <span
        className={styles.status}
        role="status"
        aria-live="polite"
        style={{ opacity: happy || activeCue ? 1 : 0 } as CSSProperties}
      >
        {activeCue ? CARE_LABEL[activeCue.kind] : petting ? 'Prrr…' : ''}
      </span>
    </div>
  );
}
