import { describe, expect, it } from 'vitest';
import { modelingToneCatalog, modelingToneFields } from './modelingTones';

describe('modelingTones', () => {
  it('lists guitar-mode category · tone combinations', () => {
    const catalog = modelingToneCatalog('GUITAR');
    expect(catalog.some((pick) => pick.label === 'E.GTR · CLA-ST')).toBe(true);
    expect(catalog.some((pick) => pick.label === 'AC · NYLON')).toBe(true);
  });

  it('resolves number fields for a category', () => {
    const slot = modelingToneFields('GUITAR', 'SYNTH');
    expect(slot?.category).toBe('SYNTH');
    expect(slot?.numberField.definition.description).toMatch(/SYNTH/i);
  });
});
