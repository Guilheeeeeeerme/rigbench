import { describe, expect, it } from 'vitest';
import { PROMPT_EN, PROMPT_PT, renderPrompt } from './prompts';

const SHARED_RULES = ['JSON', 'search', 'SysEx', 'FIELDS', '{CONTEXT}'];

describe('prompts', () => {
  it('ships EN and PT with the shared rule checklist', () => {
    for (const prompt of [PROMPT_EN, PROMPT_PT]) {
      for (const rule of SHARED_RULES) {
        expect(prompt).toContain(rule);
      }
    }
  });

  it('PT mirrors invent-key and temporary-patch rules', () => {
    expect(PROMPT_PT).toMatch(/invente|Nunca invente/i);
    expect(PROMPT_PT).toMatch(/cópia de trabalho/i);
  });

  it('renders the context placeholder', () => {
    expect(renderPrompt(PROMPT_EN, 'amp/amp/ampGain | Amp Gain')).toContain('amp/amp/ampGain');
    expect(renderPrompt(PROMPT_EN, 'x')).not.toContain('{CONTEXT}');
  });
});
