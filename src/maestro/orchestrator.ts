import type { Locale } from '../copy';
import type { GkMode } from '../devices/gr55/editor';
import { assembleContext, serializeContext } from './contextLadder';
import type { ContextRequest } from './contextLadder';
import { isMaestroReply } from './contracts';
import type { MaestroReply, ValidatedPlan } from './contracts';
import type { RegistryEntry } from './fieldRegistry';
import type { HistoryMessage as StoredMessage } from './history';
import { decide } from './policy';
import type { AskProvider, HistoryMessage as ProviderHistory } from './provider';
import { ProviderError } from './provider';
import { PROMPT_EN, PROMPT_PT, renderPrompt } from './prompts';
import type { SessionId } from './session';
import { getApiKey } from './settings';
import { validatePlan } from './validator';

export const ROUND_CAP = 3;

export type TurnState =
  'idle' | 'thinking' | 'proposal' | 'answer' | 'confirmLoad' | 'error' | 'needsKey' | 'stopped';

export interface LoadSlotAsk {
  label: string;
  bankMsb: number;
  programChange: number;
}

export interface TurnResult {
  state: TurnState;
  reply?: string;
  intent?: string;
  plan?: ValidatedPlan;
  loadSlot?: LoadSlotAsk;
  error?: string;
  errorCode?: string;
  rounds: number;
}

export interface OrchestratorEditor {
  gkMode: GkMode;
  patchName: string;
  readFormatted: (entry: RegistryEntry) => string;
}

export interface SlotResolver {
  /** Resolve a label like `U14:2` into bank/PC, or undefined if unknown. */
  resolve(label: string): LoadSlotAsk | undefined;
}

export interface OrchestratorDeps {
  provider: AskProvider;
  entries: readonly RegistryEntry[];
  index: Map<string, RegistryEntry>;
  editor: OrchestratorEditor;
  locale: Locale;
  stageLive: boolean;
  /** Active Studio session when embedded; gates loadSlot / future system staging. */
  session?: SessionId;
  visiblePageId?: string;
  sourceNote: string;
  history?: readonly StoredMessage[];
  slots?: SlotResolver;
  getKey?: () => string | undefined;
}

let activeController: AbortController | undefined;

export function abortActiveTurn(): void {
  activeController?.abort();
  activeController = undefined;
}

function promptFor(locale: Locale): string {
  return locale === 'pt-BR' ? PROMPT_PT : PROMPT_EN;
}

function toProviderHistory(messages: readonly StoredMessage[] | undefined): ProviderHistory[] {
  if (!messages) return [];
  const out: ProviderHistory[] = [];
  for (const message of messages) {
    if (message.role === 'user') out.push({ role: 'user', text: message.text });
    if (message.role === 'assistant') out.push({ role: 'model', text: message.text });
  }
  return out.slice(-20);
}

function matchSearch(entries: readonly RegistryEntry[], query: string): RegistryEntry[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];
  return entries.filter(
    (entry) =>
      !entry.readOnly &&
      (entry.label.toLowerCase().includes(needle) || entry.fieldKey.toLowerCase().includes(needle)),
  );
}

function parseReply(raw: unknown): MaestroReply | undefined {
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      return isMaestroReply(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
  return isMaestroReply(raw) ? raw : undefined;
}

/**
 * One user turn: context → provider (≤3 rounds for repair/search) → validate.
 */
export async function runTurn(text: string, deps: OrchestratorDeps): Promise<TurnResult> {
  abortActiveTurn();
  const controller = new AbortController();
  activeController = controller;

  const getKey = deps.getKey ?? getApiKey;
  if (!getKey()) {
    return { state: 'needsKey', rounds: 0 };
  }

  if (deps.stageLive) {
    return {
      state: 'error',
      error: 'stageLive',
      errorCode: 'stageLive',
      rounds: 0,
    };
  }

  let rounds = 0;
  const forcedFull = new Set<string>();

  const buildContext = (query: string) => {
    const request: ContextRequest = {
      query,
      patchName: deps.editor.patchName,
      sourceNote: deps.sourceNote,
      modeNote: deps.editor.gkMode,
      visiblePageId: deps.visiblePageId,
    };
    const fields = assembleContext(deps.entries, deps.editor.readFormatted, request).map((field) =>
      forcedFull.has(field.entry.key) ? { ...field, depth: 'full' as const } : field,
    );
    for (const key of forcedFull) {
      if (!fields.some((field) => field.entry.key === key)) {
        const entry = deps.index.get(key);
        if (entry) {
          fields.push({ entry, depth: 'full', value: deps.editor.readFormatted(entry) });
        }
      }
    }
    return serializeContext(fields, request);
  };

  const call = async (userText: string, system: string): Promise<unknown> => {
    rounds += 1;
    console.debug('[maestro] round', rounds, 'chars', system.length + userText.length);
    return deps.provider.reply(
      {
        system,
        history: toProviderHistory(deps.history),
        user: userText,
      },
      controller.signal,
    );
  };

  try {
    let system = renderPrompt(promptFor(deps.locale), buildContext(text));
    let raw = await call(text, system);
    let reply = parseReply(raw);

    if (!reply && rounds < ROUND_CAP) {
      raw = await call('reply JSON matching the schema only', system);
      reply = parseReply(raw);
    }

    if (!reply) {
      const fallback = typeof raw === 'string' ? raw : 'I could not parse that reply.';
      return { state: 'answer', reply: fallback, rounds };
    }

    while (reply.kind === 'search' && rounds < ROUND_CAP) {
      const needle = reply.search?.trim() || text;
      const hits = matchSearch(deps.entries, needle);
      for (const hit of hits.slice(0, 40)) forcedFull.add(hit.key);
      system = renderPrompt(promptFor(deps.locale), buildContext(`${text} ${needle}`));
      raw = await call(
        `Search matched ${hits.length} fields for "${needle}". Continue with edit or explain.`,
        system,
      );
      const next = parseReply(raw);
      if (!next) break;
      reply = next;
    }

    if (reply.loadSlot?.trim()) {
      const label = reply.loadSlot.trim();
      const decision = decide(null, 'loadSlot', {
        stageLive: deps.stageLive,
        session: deps.session,
      });
      if (decision === 'deny') {
        return {
          state: 'error',
          reply: reply.reply,
          intent: reply.intent,
          error: 'loadSlot-denied',
          errorCode: 'loadSlot-denied',
          rounds,
        };
      }
      const resolved = deps.slots?.resolve(label);
      if (!resolved) {
        return {
          state: 'answer',
          reply: reply.reply || `Unknown slot ${label}`,
          intent: reply.intent,
          rounds,
        };
      }
      return {
        state: 'confirmLoad',
        reply: reply.reply,
        intent: reply.intent,
        loadSlot: resolved,
        rounds,
      };
    }

    if (reply.kind === 'edit') {
      const plan = validatePlan(reply.changes ?? [], deps.index, deps.editor.readFormatted);
      if (plan.accepted.length + plan.clamped.length > 0) {
        return {
          state: 'proposal',
          reply: reply.reply,
          intent: reply.intent,
          plan,
          rounds,
        };
      }
      return {
        state: 'answer',
        reply: reply.reply,
        intent: reply.intent,
        plan,
        rounds,
      };
    }

    return {
      state: 'answer',
      reply: reply.reply,
      intent: reply.intent,
      rounds,
    };
  } catch (error) {
    if (controller.signal.aborted) {
      return { state: 'stopped', rounds };
    }
    if (error instanceof ProviderError) {
      if (error.code === 'needsKey') return { state: 'needsKey', rounds };
      return {
        state: 'error',
        error: error.message,
        errorCode: error.code,
        rounds,
      };
    }
    return {
      state: 'error',
      error: error instanceof Error ? error.message : 'unknown',
      errorCode: 'unreachable',
      rounds,
    };
  } finally {
    if (activeController === controller) activeController = undefined;
  }
}
