import { describe, expect, it } from 'vitest';
import { buildFieldRegistry } from './fieldRegistry';
import { isPatchRecipeQuery, matchPcmTones, toneNeedlesOf } from './toneMatch';

describe('toneMatch', () => {
  const labels = buildFieldRegistry('GUITAR').find((entry) => entry.key === 'pcm1/tone/toneSelect')!
    .labels!;

  it('maps metais to brass needles', () => {
    expect(toneNeedlesOf('Solo de Metais')).toEqual(
      expect.arrayContaining(['Brass', 'Horn', 'metais', 'solo']),
    );
  });

  it('finds brass tones for a Portuguese metals recipe', () => {
    const hits = matchPcmTones('PCM1 metais brass', labels, 12);
    expect(hits.some((label) => /brass/i.test(label))).toBe(true);
  });

  it('detects full patch recipes', () => {
    expect(
      isPatchRecipeQuery(
        'Faça o patch USER 01-2: INIT, PCM1 metais ON, Normal Pickup 100, CTL PCM1 SW',
      ),
    ).toBe(true);
    expect(isPatchRecipeQuery('o que é reverb?')).toBe(false);
  });
});
