// Which way the study scene is drawn. Clay is a prototype under review:
// soft matte surfaces with a velvet sheen, studio light, no ink line. In
// development, `?cat=toon` shows the original cel-shaded look beside it.
export const CLAY =
  process.env.NODE_ENV === 'production' ||
  typeof window === 'undefined' ||
  new URLSearchParams(window.location.search).get('cat') !== 'toon';

// Her proportions and give. Clay is chibi: a bigger head and eyes, a bouncier
// squash, deeper breaths, and a slow swell while she purrs. Toon keeps the
// original numbers.
export const SHAPE = CLAY
  ? {
      head: 1.12,
      headLift: 0.035,
      eyes: 1.18,
      squash: 1.35,
      headFollow: 0.35,
      breath: 1.6,
      purrSwell: 0.009,
    }
  : {
      head: 1,
      headLift: 0,
      eyes: 1,
      squash: 1,
      headFollow: 0,
      breath: 1,
      purrSwell: 0,
    };
