const SESSION_KEY = 'maestro.apiKey.session';
const REMEMBER_KEY = 'maestro.apiKey.remember';

function sessionStore(): Storage | undefined {
  try {
    return typeof sessionStorage !== 'undefined' ? sessionStorage : undefined;
  } catch {
    return undefined;
  }
}

function localStore(): Storage | undefined {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : undefined;
  } catch {
    return undefined;
  }
}

/** Session key first, then the remembered localStorage copy. */
export function getApiKey(): string | undefined {
  try {
    const session = sessionStore()?.getItem(SESSION_KEY);
    if (session) return session;
    const remembered = localStore()?.getItem(REMEMBER_KEY);
    return remembered || undefined;
  } catch {
    return undefined;
  }
}

export function setApiKey(value: string, remember: boolean): void {
  const trimmed = value.trim();
  try {
    sessionStore()?.setItem(SESSION_KEY, trimmed);
    if (remember) {
      localStore()?.setItem(REMEMBER_KEY, trimmed);
    } else {
      localStore()?.removeItem(REMEMBER_KEY);
    }
  } catch {
    // Private mode / quota — key still usable for this turn via session if set.
  }
}

export function forgetApiKey(): void {
  try {
    sessionStore()?.removeItem(SESSION_KEY);
    localStore()?.removeItem(REMEMBER_KEY);
  } catch {
    // ignore
  }
}

export function isRemembered(): boolean {
  try {
    return Boolean(localStore()?.getItem(REMEMBER_KEY));
  } catch {
    return false;
  }
}

export type TestKeyResult =
  | { ok: true }
  | { ok: false; error: 'needsKey' | 'badKey' | 'rateLimited' | 'unreachable' | 'timeout' };

/**
 * Tiny generateContent ping. Injected fetch keeps tests offline.
 */
export async function testApiKey(
  fetchImpl: typeof fetch = fetch,
  key: string | undefined = getApiKey(),
): Promise<TestKeyResult> {
  if (!key) return { ok: false, error: 'needsKey' };
  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetchImpl(`${url}?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: { ok: { type: 'boolean' } },
            required: ['ok'],
          },
        },
      }),
    });
    if (response.status === 400) return { ok: false, error: 'needsKey' };
    if (response.status === 401 || response.status === 403) return { ok: false, error: 'badKey' };
    if (response.status === 429) return { ok: false, error: 'rateLimited' };
    if (!response.ok) return { ok: false, error: 'unreachable' };
    return { ok: true };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { ok: false, error: 'timeout' };
    }
    return { ok: false, error: 'unreachable' };
  } finally {
    clearTimeout(timer);
  }
}
