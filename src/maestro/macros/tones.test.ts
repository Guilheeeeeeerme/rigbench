import { describe, expect, it } from 'vitest';
import { buildFieldRegistry, registryIndex } from '../fieldRegistry';
import { PCM_TONE_CATEGORIES, synthVoiceOptions } from './tones';

describe('PCM tone browse catalog', () => {
  const labels = new Set(
    registryIndex(buildFieldRegistry('GUITAR')).get('pcm1/tone/toneSelect')!.labels,
  );

  it('uses real toneSelect enum labels', () => {
    for (const category of PCM_TONE_CATEGORIES) {
      for (const tone of category.tones) {
        expect(labels.has(tone.toneSelect), tone.toneSelect).toBe(true);
      }
    }
  });

  it('includes sanfona, gaita, and sax families', () => {
    const ids = PCM_TONE_CATEGORIES.map((category) => category.id);
    expect(ids).toContain('accordion');
    expect(ids).toContain('harmonica');
    expect(ids).toContain('sax');
  });

  it('builds Off plus tone options with pcm1 writes', () => {
    const options = synthVoiceOptions();
    expect(options[0]?.id).toBe('off');
    const accordion = options.find((option) => option.id === 'accordion-fr')!;
    expect(
      accordion.writes.some(
        (write) => write.domain === 'patch' && write.key === 'pcm1/tone/toneSelect',
      ),
    ).toBe(true);
  });
});
