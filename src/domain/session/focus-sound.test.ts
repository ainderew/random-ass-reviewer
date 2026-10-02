import {
  SILENT_MIX,
  describeMix,
  focusLayer,
  isFocusLayer,
  parseMix,
  setLayerVolume,
  silence,
  toggleLayer,
  type FocusLayerId,
} from './focus-sound';

describe('focus sound mix', () => {
  it('starts silent', () => {
    expect(parseMix(null)).toEqual(SILENT_MIX);
    expect(describeMix(SILENT_MIX)).toBe('off');
  });

  it('layers sounds in a fixed order, and silence turns them all off', () => {
    const mix = toggleLayer(toggleLayer(SILENT_MIX, 'piano'), 'rain');
    expect(mix.on).toEqual(['rain', 'piano']);
    expect(describeMix(mix)).toBe('Rain and Soft piano');
    expect(describeMix(toggleLayer(mix, 'brown'))).toBe(
      'Rain, Brown noise and Soft piano',
    );
    expect(toggleLayer(mix, 'rain').on).toEqual(['piano']);
    expect(silence(mix).on).toEqual([]);
  });

  it('keeps a layer volume while it is off', () => {
    const quiet = setLayerVolume(SILENT_MIX, 'rain', 0.2);
    const back = toggleLayer(
      toggleLayer(toggleLayer(quiet, 'rain'), 'rain'),
      'rain',
    );
    expect(back.on).toEqual(['rain']);
    expect(back.volume.rain).toBe(0.2);
    expect(setLayerVolume(quiet, 'piano', 3).volume.piano).toBe(1);
  });

  it('round-trips through storage and drops anything it does not know', () => {
    const mix = setLayerVolume(toggleLayer(SILENT_MIX, 'brown'), 'brown', 0.35);
    expect(parseMix(JSON.stringify(mix))).toEqual(mix);
    expect(
      parseMix(
        JSON.stringify({
          on: ['piano', 'whale-song', 'piano', 'rain'],
          volume: { rain: 7, piano: 'loud', brown: 0.1 },
        }),
      ),
    ).toEqual({
      on: ['rain', 'piano'],
      volume: { rain: 0.6, brown: 0.1, piano: 0.6 },
    });
    expect(parseMix('{not json')).toEqual(SILENT_MIX);
    expect(parseMix('"rain"')).toEqual(SILENT_MIX);
    expect(parseMix('{"on":"rain","volume":null}')).toEqual(SILENT_MIX);
  });

  it('knows its layers', () => {
    expect(isFocusLayer('rain')).toBe(true);
    expect(isFocusLayer('off')).toBe(false);
    expect(focusLayer('piano').short).toBe('Piano');
    expect(focusLayer('lofi' as FocusLayerId).id).toBe('rain');
  });
});
