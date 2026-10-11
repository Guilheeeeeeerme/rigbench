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

  it('compiles a solo+guitar recipe without calling Gemini', async () => {
    const provider = fakeProvider([]);
    const result = await runTurn(
      'Patch USER 01-1: Solo de Gaita + Violão 50/50. INIT, PCM1 gaita/harmonica ON, Normal Pickup 100, CTL PCM1 SW TOGGLE. WRITE USER 01-1.',
      deps(provider, {
        getKey: () => undefined,
        locale: 'pt-BR',
        session: 'bank',
        slots: {
          resolve: (label) =>
            /01-1|01:1/i.test(label)
              ? { label: 'U01-1', bankMsb: 0, programChange: 0 }
              : undefined,
        },
      }),
    );
    expect(provider.reply).not.toHaveBeenCalled();
    expect(result.state).toBe('proposal');
    expect(result.autoApply).toBe(true);
    expect(result.plan?.accepted.length).toBeGreaterThan(10);
    expect(result.loadSlot?.label).toBe('U01-1');
    expect(result.reply).toMatch(/TONE SW|Harmonica|USER 01-1/i);
  });

  it('compiles the EN three-key bank set with select+apply steps', async () => {
    const provider = fakeProvider([]);
    const prompt = `
USER 01-1: Accordion Solo + Piezo Acoustic. PCM1 Accordion. CTL OFF piezo only.
USER 01-2: Brass Section Solo + Piezo Acoustic. PCM1 Brass. CTL TOGGLE.
USER 01-3: Cumbia Synth Lead + Piezo Acoustic. PCM1 Synth Reed. Initialized Normal Pickup 100.
CTL pedal PCM1 SW LATCH.`;
    const result = await runTurn(
      prompt,
      deps(provider, {
        getKey: () => undefined,
        locale: 'en',
        session: 'bank',
        slots: {
          resolve: (label) => {
            const m = label.match(/0*1\s*[:-]\s*([123])/i);
            if (!m) return undefined;
            const pc = Number(m[1]) - 1;
            return { label: `U01-${m[1]}`, bankMsb: 0, programChange: pc };
          },
        },
      }),
    );
    expect(provider.reply).not.toHaveBeenCalled();
    expect(result.state).toBe('proposal');
    expect(result.autoApply).toBe(true);
    expect(result.bankSteps).toHaveLength(3);
    expect(result.bankSteps![0]!.slotLabel).toBe('01-1');
    expect(result.bankSteps![1]!.slotLabel).toBe('01-2');
    expect(result.bankSteps![2]!.slotLabel).toBe('01-3');
    expect(result.reply).toMatch(/Bank set|TONE SW|temporary|WRITE/i);
  });

  it('compiles a Caimbé GK SYSTEM recipe only on Global session', async () => {
    const provider = fakeProvider([]);
    const values = new Map<number, unknown>([[0, 0]]);
    const system = {
      read: (field: { address: number }) => ({
        ok: true as const,
        value: values.get(field.address) ?? 0,
      }),
      write: vi.fn(),
    };
    // gkSetSelect address from SYSTEM — stub returns 0 for active set 1.
    const { SYSTEM } = await import('../devices/gr55/systemMap');
    values.set(SYSTEM.common.gkSetSelect.address, 0);

    const onBank = await runTurn(
      'violao caimbe godin nylon piezo configuracao global gk sensibilidade',
      deps(provider, { getKey: () => undefined, locale: 'pt-BR', session: 'bank' }),
    );
    expect(onBank.state).toBe('answer');
    expect(onBank.reply).toMatch(/Global/i);

    const onGlobal = await runTurn(
      'violao caimbe godin nylon piezo configuracao global gk sensibilidade ghost',
      deps(provider, {
        getKey: () => undefined,
        locale: 'pt-BR',
        session: 'system',
        system: system as never,
      }),
    );
    expect(provider.reply).not.toHaveBeenCalled();
    expect(onGlobal.state).toBe('proposal');
    expect(onGlobal.autoApply).toBe(true);
    expect(onGlobal.systemPlan?.accepted.length).toBeGreaterThan(8);
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
        session: 'bank',
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
