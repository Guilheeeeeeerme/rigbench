import { describe, expect, it, vi } from 'vitest';
import { buildFieldRegistry, registryIndex } from './fieldRegistry';
import { abortActiveTurn, runTurn } from './orchestrator';
import type { AskProvider } from './provider';
import { ProviderError } from './provider';

function deps(provider: AskProvider, extras: Partial<Parameters<typeof runTurn>[1]> = {}) {
  const entries = buildFieldRegistry('GUITAR');
  return {
    provider,
    entries,
    index: registryIndex(entries),
    editor: {
      gkMode: 'GUITAR' as const,
      patchName: 'Blues',
      readFormatted: () => '0',
    },
    locale: 'en' as const,
    stageLive: false,
    sourceNote: 'slot U01:1',
    getKey: () => 'TEST_KEY',
    ...extras,
  };
}

function fakeProvider(replies: unknown[]): AskProvider {
  let i = 0;
  return {
    reply: vi.fn(async () => {
      const next = replies[Math.min(i, replies.length - 1)];
      i += 1;
      return next;
    }),
  };
}

describe('runTurn', () => {
  it('returns needsKey when no API key is set', async () => {
    const result = await runTurn('hi', deps(fakeProvider([]), { getKey: () => undefined }));
    expect(result.state).toBe('needsKey');
  });

  it('runs exactly one repair round on malformed JSON then degrades', async () => {
    const provider = fakeProvider(['not-json', 'still-not-json']);
    const result = await runTurn('hi', deps(provider));
    expect(provider.reply).toHaveBeenCalledTimes(2);
    expect(result.state).toBe('answer');
    expect(result.rounds).toBe(2);
  });

  it('appends search hits and respects the round cap', async () => {
    const provider = fakeProvider([
      { kind: 'search', reply: 'looking', search: 'reverb' },
      { kind: 'search', reply: 'still', search: 'time' },
      { kind: 'search', reply: 'again', search: 'level' },
      { kind: 'explain', reply: 'done' },
    ]);
    const result = await runTurn('mais reverb', deps(provider));
    expect(result.rounds).toBeLessThanOrEqual(3);
    expect(provider.reply).toHaveBeenCalledTimes(3);
  });

  it('emits confirmLoad when loadSlot is present and policy asks', async () => {
    const provider = fakeProvider([{ kind: 'explain', reply: 'loading', loadSlot: 'U01:1' }]);
    const result = await runTurn(
      'load U01:1',
      deps(provider, {
        slots: {
          resolve: (label) =>
            label === 'U01:1' ? { label: 'U01:1', bankMsb: 0, programChange: 0 } : undefined,
        },
      }),
    );
    expect(result.state).toBe('confirmLoad');
    expect(result.loadSlot?.label).toBe('U01:1');
  });

  it('returns a proposal when edit items validate', async () => {
    const ampGain = buildFieldRegistry('GUITAR').find((entry) => entry.fieldKey === 'ampGain')!;
    const provider = fakeProvider([
      {
        kind: 'edit',
        intent: 'gain',
        reply: 'raising gain',
        changes: [{ key: ampGain.key, value: 70, why: 'stage' }],
      },
    ]);
    const result = await runTurn('more gain', deps(provider));
    expect(result.state).toBe('proposal');
    expect(result.plan?.accepted).toHaveLength(1);
  });

  it('maps provider badKey to error', async () => {
    const provider: AskProvider = {
      reply: async () => {
        throw new ProviderError('badKey');
      },
    };
    const result = await runTurn('hi', deps(provider));
    expect(result.state).toBe('error');
    expect(result.errorCode).toBe('badKey');
  });

  it('can abort an in-flight turn', async () => {
    const provider: AskProvider = {
      reply: (_req, signal) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () => {
            const err = new Error('aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }),
    };
    const pending = runTurn('hi', deps(provider));
    abortActiveTurn();
    const result = await pending;
    expect(result.state).toBe('stopped');
  });
});
