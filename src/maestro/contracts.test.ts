import { describe, expect, it } from 'vitest';
import { isMaestroReply } from './contracts';

describe('isMaestroReply', () => {
  it('accepts a minimal explain reply', () => {
    expect(isMaestroReply({ kind: 'explain', reply: 'ok' })).toBe(true);
  });

  it('accepts an edit reply with changes', () => {
    expect(
      isMaestroReply({
        kind: 'edit',
        intent: 'dryer',
        reply: 'proposed',
        changes: [{ key: 'amp/amp/ampGain', value: 70, why: 'stage' }],
      }),
    ).toBe(true);
  });

  it('rejects missing reply or bad kind', () => {
    expect(isMaestroReply({ kind: 'edit' })).toBe(false);
    expect(isMaestroReply({ kind: 'nope', reply: 'x' })).toBe(false);
    expect(isMaestroReply(null)).toBe(false);
  });

  it('rejects malformed changes', () => {
    expect(isMaestroReply({ kind: 'edit', reply: 'x', changes: [{ key: 1, value: 2 }] })).toBe(
      false,
    );
  });
});
