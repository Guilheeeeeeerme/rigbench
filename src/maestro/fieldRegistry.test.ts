import { describe, expect, it } from 'vitest';
import { TEMPORARY_PATCH_ADDRESS } from '../devices/gr55/patchLayout';
import { buildFieldRegistry, registryIndex } from './fieldRegistry';

describe('buildFieldRegistry', () => {
  const guitar = buildFieldRegistry('GUITAR');
  const bass = buildFieldRegistry('BASS');

  it('builds hundreds of temporary-patch entries', () => {
    expect(guitar.length).toBeGreaterThan(400);
  });

  it('has unique keys', () => {
    const keys = guitar.map((entry) => entry.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('only includes temporary-patch (🟠) addresses', () => {
    for (const entry of guitar) {
      expect(entry.ref.address).toBeGreaterThanOrEqual(TEMPORARY_PATCH_ADDRESS);
    }
  });

  it('exposes ampGain as numeric with min/max', () => {
    const ampGain = guitar.find((entry) => entry.fieldKey === 'ampGain');
    expect(ampGain).toBeDefined();
    expect(ampGain!.key).toMatch(/^amp\//);
    expect(ampGain!.kind).toBe('numeric');
    expect(typeof ampGain!.min).toBe('number');
    expect(typeof ampGain!.max).toBe('number');
    expect(ampGain!.min!).toBeLessThan(ampGain!.max!);
  });

  it('exposes patchName as a string field', () => {
    const name = guitar.find((entry) => entry.fieldKey === 'patchName');
    expect(name).toBeDefined();
    expect(name!.kind).toBe('string');
    expect(name!.key).toBe('patch/common/patchName');
  });

  it('marks every assigns entry as complex', () => {
    const assigns = guitar.filter((entry) => entry.key.startsWith('assigns/'));
    expect(assigns.length).toBeGreaterThan(0);
    expect(assigns.every((entry) => entry.complex)).toBe(true);
  });

  it('rebuilds a different key set for BASS vs GUITAR', () => {
    const guitarKeys = new Set(guitar.map((entry) => entry.key));
    const bassKeys = new Set(bass.map((entry) => entry.key));
    expect(guitarKeys).not.toEqual(bassKeys);
  });

  it('indexes entries by key', () => {
    const index = registryIndex(guitar);
    expect(index.size).toBe(guitar.length);
    const first = guitar[0];
    expect(index.get(first.key)).toBe(first);
  });
});
