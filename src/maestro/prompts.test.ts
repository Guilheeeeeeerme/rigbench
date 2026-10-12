import { describe, expect, it } from 'vitest';
import { PROMPT_EN, PROMPT_PT, renderPrompt } from './prompts';

const SHARED_RULES = [
  'JSON',
  'FIELDS',
  '{CONTEXT}',
  'MANUAL CANON',
  'TONE SW',
  'muteSwitch',
  'PATCH WRITE',
];

describe('prompts', () => {
  it('ships EN and PT with the manual canon checklist', () => {
    for (const prompt of [PROMPT_EN, PROMPT_PT]) {
      for (const rule of SHARED_RULES) {
        expect(prompt).toContain(rule);
      }
    }
  });

  it('PT and EN both bind CTL myths to TONE SW + LATCH', () => {
    expect(PROMPT_PT).toMatch(/TONE SW/);
    expect(PROMPT_EN).toMatch(/PCM1 SW/);
    expect(PROMPT_EN).toMatch(/LATCH/);
    expect(PROMPT_EN).toMatch(/true = MUTE/);
  });


  it('renders the context placeholder', () => {
    expect(renderPrompt(PROMPT_EN, 'amp/amp/ampGain | Amp Gain')).toContain('amp/amp/ampGain');
    expect(renderPrompt(PROMPT_EN, 'x')).not.toContain('{CONTEXT}');
  });
});
