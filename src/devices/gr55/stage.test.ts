import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { SETUP_STEPS, loadSetup, saveSetup, skippedSteps } from './setupState';

/** Just enough of localStorage for the modules that keep their state there. */
function fakeStorage() {
  const items = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  });
  return items;
}

describe('stage setup state', () => {
  beforeEach(() => void fakeStorage());
  afterEach(() => vi.unstubAllGlobals());

  test('a pedal met for the first time has no setup', () => {
    expect(loadSetup()).toEqual({ rigName: '', steps: {}, complete: false, gkNotes: {} });
  });

  test('skipped steps are remembered for the Stage, sync aside', () => {
    saveSetup({
      rigName: 'Rig',
      steps: { rig: 'ok', backup: 'warn', midi: 'warn', sync: 'warn' },
      complete: true,
      gkNotes: { 2: 'Godin' },
    });
    const setup = loadSetup();
    expect(setup.complete).toBe(true);
    expect(setup.gkNotes[2]).toBe('Godin');
    expect(skippedSteps(setup)).toEqual(['midi', 'backup']);
    expect(SETUP_STEPS).toHaveLength(8);
  });
});
