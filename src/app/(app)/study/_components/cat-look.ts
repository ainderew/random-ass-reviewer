import type { PetMood } from '@/domain/pet/happiness';
import type { PetView } from '@/domain/types';
import type { Feeling } from '@/game/character/cat-brain';
import type { CatLook } from '@/game/character/study-cat';

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
