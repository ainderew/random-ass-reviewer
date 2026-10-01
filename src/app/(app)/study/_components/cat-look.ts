import type { PetMood } from '@/domain/pet/happiness';
import type { CareRequest, PetView } from '@/domain/types';
import type { Feeling } from '@/game/character/cat-brain';
import type { CareCue, CatLook } from '@/game/character/study-cat';

const FEELING: Record<PetMood, Feeling> = {
  sad: 'sad',
  lonely: 'lonely',
  content: 'content',
  happy: 'happy',
  delighted: 'happy',
  'over-the-moon': 'happy',
};

// What the scene needs to draw her as the server describes her.
export function catLook(pet: PetView): CatLook {
  return { round: pet.roundness, feeling: FEELING[pet.mood], coat: pet.coat };
}

// The animation for an act of care the server has just accepted.
export function cueFor(
  request: CareRequest,
  gramsBefore: number,
  pet: PetView,
): CareCue {
  const id = Date.now();
  if (request.action === 'feed') {
    const added = pet.grams - gramsBefore;
    return {
      id,
      kind: 'eat',
      toy: null,
      note: added > 0 ? `+${added} g` : 'As round as she gets',
    };
  }
  if (request.action === 'play') return { id, kind: 'play', toy: request.toy };
  return { id, kind: request.action, toy: null };
}
