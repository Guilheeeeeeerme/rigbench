import { describe, expect, it } from 'vitest';
import { buildFieldRegistry, registryIndex } from './fieldRegistry';
import { validatePlan } from './validator';

describe('validatePlan', () => {
  const index = registryIndex(buildFieldRegistry('GUITAR'));
  const ampGain = [...index.values()].find((entry) => entry.fieldKey === 'ampGain')!;
  const patchName = index.get('patch/common/patchName')!;
  const chorusSwitch = [...index.values()].find((entry) => entry.fieldKey === 'chorusSwitch')!;
  const assign = [...index.values()].find((entry) => entry.key.startsWith('assigns/'))!;

  const readCurrent = () => 'current';

  it('accepts ampGain within range', () => {
    const plan = validatePlan([{ key: ampGain.key, value: 70, why: 'stage' }], index, readCurrent);
    expect(plan.accepted).toHaveLength(1);
    expect(plan.accepted[0].coerced).toBe(70);
    expect(plan.rejected).toHaveLength(0);
  });

  it('rejects unknown parameters', () => {
    const plan = validatePlan([{ key: 'reverb/reverb/magicTail', value: 3 }], index, readCurrent);
    expect(plan.rejected[0].reason).toBe('unknown-parameter');
  });

  it('accepts PT boolean LIGAR as on for effect switches', () => {
    const plan = validatePlan([{ key: chorusSwitch.key, value: 'LIGAR' }], index, readCurrent);
    expect(plan.accepted).toHaveLength(1);
    expect(plan.accepted[0].coerced).toBe(true);
  });

  it('maps ligar/on to UNMUTE on inverted mute fields', () => {
    const mute = index.get('pcm1/tone/muteSwitch')!;
    const plan = validatePlan([{ key: mute.key, value: 'ligar' }], index, readCurrent);
    expect(plan.accepted).toHaveLength(1);
    expect(plan.accepted[0].coerced).toBe(false);
  });

  it('resolves a unique PCM tone prefix', () => {
    const tone = index.get('pcm1/tone/toneSelect')!;
    const plan = validatePlan([{ key: tone.key, value: 'Harmonica 1' }], index, readCurrent);
    expect(plan.accepted).toHaveLength(1);
    expect(plan.accepted[0].coerced).toBe('Harmonica 1');
  });

  it('rejects assigns as not-writable-v1 with an editor link', () => {
    const plan = validatePlan([{ key: assign.key, value: 1 }], index, readCurrent);
    expect(plan.rejected[0].reason).toMatch(/^not-writable-v1/);
    expect(plan.rejected[0].reason).toContain('/gr55/editor/assigns/');
  });

  it('truncates long patch names and accepts with a truncated note', () => {
    const plan = validatePlan(
      [{ key: patchName.key, value: 'Blues com Sustain Épico!!' }],
      index,
      readCurrent,
    );
    expect(plan.clamped).toHaveLength(1);
    expect(plan.clamped[0].reason).toBe('truncated');
    expect(String(plan.clamped[0].coerced).length).toBeLessThanOrEqual(
      patchName.ref.definition.size,
    );
  });

  it('rejects numeric values outside range without clamping', () => {
    const plan = validatePlan([{ key: ampGain.key, value: 999 }], index, readCurrent);
    expect(plan.rejected[0].reason).toMatch(/out-of-range/);
    expect(plan.accepted).toHaveLength(0);
    expect(plan.clamped).toHaveLength(0);
  });

  it('accepts boolean ON/OFF synonyms', () => {
    const plan = validatePlan([{ key: chorusSwitch.key, value: 'ON' }], index, readCurrent);
    expect(plan.accepted).toHaveLength(1);
    expect(plan.accepted[0].coerced).toBe(true);
  });

  it('suggests a near-miss enum label without applying it', () => {
    const ampType = [...index.values()].find((entry) => entry.fieldKey === 'ampGainSwitch')!;
    const plan = validatePlan([{ key: ampType.key, value: 'MIDD' }], index, readCurrent);
    expect(plan.rejected[0].reason).toBe('did you mean: MID?');
  });
});
