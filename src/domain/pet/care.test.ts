import {
  BOWL_MS,
  MAX_GRAMS,
  START_GRAMS,
  bowlsEarned,
  bowlsFilled,
  cleanPetName,
  minutesToNextBowl,
  roundness,
  toyUnlocked,
  treatsEarned,
  weightGrams,
  weightStage,
} from './care';

const H = 3_600_000;
const none = { focusMs: 0, highGrades: 0, cardsRecalled: 0 };

describe('kibble', () => {
  it('fills one bowl per 25 credited minutes', () => {
    expect(bowlsEarned(0)).toBe(0);
    expect(bowlsEarned(BOWL_MS - 1)).toBe(0);
    expect(bowlsEarned(BOWL_MS)).toBe(1);
    expect(bowlsEarned(2 * H)).toBe(4);
    expect(bowlsEarned(-5)).toBe(0);
  });

  it('says how many minutes until the next bowl', () => {
    expect(minutesToNextBowl(0)).toBe(25);
    expect(minutesToNextBowl(10 * 60_000)).toBe(15);
    expect(minutesToNextBowl(BOWL_MS)).toBe(25);
    expect(minutesToNextBowl(24.5 * 60_000)).toBe(1);
  });

  it('counts the bowls a session filled across the boundary', () => {
    expect(bowlsFilled(20 * 60_000, 10 * 60_000)).toBe(1);
    expect(bowlsFilled(0, 10 * 60_000)).toBe(0);
    expect(bowlsFilled(0, 50 * 60_000)).toBe(2);
  });
});

describe('treats', () => {
  it('pays two per good quiz', () => {
    expect(treatsEarned(0)).toBe(0);
    expect(treatsEarned(3)).toBe(6);
    expect(treatsEarned(-1)).toBe(0);
  });
});

describe('weight', () => {
  it('adds 100 g per bowl and stops at the roundest', () => {
    expect(weightGrams(0)).toBe(START_GRAMS);
    expect(weightGrams(5)).toBe(START_GRAMS + 500);
    expect(weightGrams(1_000)).toBe(MAX_GRAMS);
    expect(weightGrams(-3)).toBe(START_GRAMS);
  });

  it('maps weight to roundness for the model', () => {
    expect(roundness(START_GRAMS)).toBe(0);
    expect(roundness(MAX_GRAMS)).toBe(1);
    expect(roundness(5_400)).toBeCloseTo(0.5);
    expect(roundness(1_000)).toBe(0);
    expect(roundness(9_000)).toBe(1);
  });

  it('names each stage', () => {
    expect(weightStage(3_600)).toBe('Slim');
    expect(weightStage(4_500)).toBe('Round');
    expect(weightStage(5_200)).toBe('Chubby');
    expect(weightStage(6_000)).toBe('Chonky');
    expect(weightStage(7_200)).toBe('Absolute loaf');
  });
});

describe('toys', () => {
  it('unlock on the same real work as the milestones', () => {
    expect(toyUnlocked('brush', none)).toBe(false);
    expect(toyUnlocked('brush', { ...none, highGrades: 3 })).toBe(true);
    expect(toyUnlocked('wand', { ...none, focusMs: 2 * H })).toBe(true);
    expect(toyUnlocked('mouse', { ...none, cardsRecalled: 149 })).toBe(false);
    expect(toyUnlocked('mouse', { ...none, cardsRecalled: 150 })).toBe(true);
    expect(toyUnlocked('yarn', { ...none, focusMs: 7 * H })).toBe(false);
  });

  it('treats an unknown toy as locked', () => {
    expect(toyUnlocked('laser' as never, { ...none, focusMs: 100 * H })).toBe(
      false,
    );
  });
});

describe('cleanPetName', () => {
  it('trims, collapses spaces and keeps it short', () => {
    expect(cleanPetName('  Mr   Whiskers ')).toBe('Mr Whiskers');
    expect(cleanPetName('A very long cat name indeed')).toBe('A very long cat');
    expect(cleanPetName('   ')).toBe('');
  });
});
