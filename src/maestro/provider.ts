import { getApiKey } from './settings';

export const GEMINI_MODEL = 'gemini-3.6-flash';

/** Pinned Gemini structured-output schema (§6.2). */
export const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    kind: { type: 'string', enum: ['edit', 'explain', 'search'] },
    intent: { type: 'string' },
    reply: { type: 'string' },
    changes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          value: {},
          why: { type: 'string' },
        },
        required: ['key', 'value'],
      },
    },
    search: { type: 'string' },
    loadSlot: {
      type: 'string',
      description: 'U##:# the user asked to load, else empty',
    },
  },
  required: ['kind', 'reply'],
} as const;

export interface HistoryMessage {
  role: 'user' | 'model';
  text: string;
}

export interface ProviderRequest {
  system: string;
  history: readonly HistoryMessage[];
  user: string;
}

export type ProviderErrorCode = 'needsKey' | 'badKey' | 'rateLimited' | 'unreachable' | 'timeout';

export class ProviderError extends Error {
  constructor(
    readonly code: ProviderErrorCode,
    message?: string,
    readonly retryAfter?: string,
  ) {
    super(message ?? code);
    this.name = 'ProviderError';
  }
}

export interface AskProvider {
  reply(req: ProviderRequest, signal?: AbortSignal): Promise<unknown>;
}

export interface GeminiProviderOptions {
  fetchImpl?: typeof fetch;
  getKey?: () => string | undefined;
  model?: string;
  timeoutMs?: number;
}

function endpoint(model: string, key: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
}

export class GeminiProvider implements AskProvider {
  private readonly fetchImpl: typeof fetch;
  private readonly getKey: () => string | undefined;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(options: GeminiProviderOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
    this.getKey = options.getKey ?? getApiKey;
    this.model = options.model ?? GEMINI_MODEL;
    this.timeoutMs = options.timeoutMs ?? 30_000;
  }

  async reply(req: ProviderRequest, signal?: AbortSignal): Promise<unknown> {
    const key = this.getKey();
    if (!key) throw new ProviderError('needsKey');

    const contents = [
      ...req.history.map((message) => ({
        role: message.role === 'model' ? 'model' : 'user',
        parts: [{ text: message.text }],
      })),
      { role: 'user', parts: [{ text: req.user }] },
    ];

    const body = {
      systemInstruction: { parts: [{ text: req.system }] },
      contents,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const onAbort = () => controller.abort();
    signal?.addEventListener('abort', onAbort);

    try {
      const response = await this.fetchImpl(endpoint(this.model, key), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (response.status === 400) throw new ProviderError('needsKey');
      if (response.status === 401 || response.status === 403) {
        throw new ProviderError('badKey');
      }
      if (response.status === 429) {
        throw new ProviderError(
          'rateLimited',
          'rateLimited',
          response.headers.get('retry-after') ?? undefined,
        );
      }
      if (!response.ok) throw new ProviderError('unreachable');

      const payload = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new ProviderError('unreachable', 'empty response');
      try {
        return JSON.parse(text) as unknown;
      } catch {
        // Return raw text so the orchestrator can attempt a repair round.
        return text;
      }
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ProviderError('timeout');
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ProviderError('timeout');
      }
      throw new ProviderError('unreachable');
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  }
}
