import { describe, expect, it, vi } from 'vitest';
import { GeminiProvider, ProviderError, RESPONSE_SCHEMA } from './provider';

function geminiText(payload: unknown): Response {
  return new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }],
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

describe('GeminiProvider', () => {
  it('parses a happy-path JSON reply', async () => {
    const fetchImpl = vi.fn(async () => geminiText({ kind: 'explain', reply: 'hello' }));
    const provider = new GeminiProvider({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      getKey: () => 'TEST_KEY',
    });
    const result = await provider.reply({
      system: 'sys',
      history: [],
      user: 'hi',
    });
    expect(result).toEqual({ kind: 'explain', reply: 'hello' });
    expect(RESPONSE_SCHEMA.required).toContain('kind');
    const call = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(call[1].body));
    expect(body.generationConfig.responseMimeType).toBe('application/json');
  });

  it.each([
    [400, 'needsKey'],
    [401, 'badKey'],
    [403, 'badKey'],
    [429, 'rateLimited'],
    [500, 'unreachable'],
  ] as const)('maps HTTP %i to %s', async (status, code) => {
    const fetchImpl = vi.fn(async () => new Response('nope', { status }));
    const provider = new GeminiProvider({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      getKey: () => 'TEST_KEY',
    });
    await expect(provider.reply({ system: 's', history: [], user: 'u' })).rejects.toMatchObject({
      code,
    });
  });

  it('maps missing key to needsKey without calling fetch', async () => {
    const fetchImpl = vi.fn();
    const provider = new GeminiProvider({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      getKey: () => undefined,
    });
    await expect(provider.reply({ system: 's', history: [], user: 'u' })).rejects.toBeInstanceOf(
      ProviderError,
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('maps abort to timeout', async () => {
    const fetchImpl = vi.fn(async (_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    });
    const provider = new GeminiProvider({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      getKey: () => 'TEST_KEY',
      timeoutMs: 5,
    });
    await expect(provider.reply({ system: 's', history: [], user: 'u' })).rejects.toMatchObject({
      code: 'timeout',
    });
  });

  it('never puts the key into the request body log object', async () => {
    const fetchImpl = vi.fn(async () => geminiText({ kind: 'explain', reply: 'x' }));
    const provider = new GeminiProvider({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      getKey: () => 'TEST_KEY',
    });
    await provider.reply({ system: 's', history: [], user: 'u' });
    const call = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.stringify(call[1])).not.toContain('TEST_KEY');
  });
});
