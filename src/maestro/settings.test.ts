import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetApiKey, getApiKey, isRemembered, setApiKey, testApiKey } from './settings';

function fakeStorage() {
  const items = new Map<string, string>();
  const api = {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
  return { items, api };
}

describe('settings', () => {
  beforeEach(() => {
    const session = fakeStorage();
    const local = fakeStorage();
    vi.stubGlobal('sessionStorage', session.api);
    vi.stubGlobal('localStorage', local.api);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('stores in session by default and optionally remembers', () => {
    setApiKey('TEST_KEY', false);
    expect(getApiKey()).toBe('TEST_KEY');
    expect(isRemembered()).toBe(false);

    setApiKey('TEST_KEY', true);
    expect(isRemembered()).toBe(true);
  });

  it('prefers session over remembered', () => {
    setApiKey('REMEMBERED', true);
    sessionStorage.setItem('maestro.apiKey.session', 'SESSION');
    expect(getApiKey()).toBe('SESSION');
  });

  it('forgets both stores', () => {
    setApiKey('TEST_KEY', true);
    forgetApiKey();
    expect(getApiKey()).toBeUndefined();
    expect(isRemembered()).toBe(false);
  });

  it('testApiKey maps HTTP statuses', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 401 }));
    await expect(testApiKey(fetchImpl as unknown as typeof fetch, 'TEST_KEY')).resolves.toEqual({
      ok: false,
      error: 'badKey',
    });
  });
});
