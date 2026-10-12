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
import {
  bankRecipeReply,
  compileBankSoloSetRecipe,
  compileSoloGuitarRecipe,
  recipeReply,
} from './recipePlan';
import {
  compileNylonPiezoGkRecipe,
  systemRecipeReply,
  validateSystemPlan,
  type SystemPlan,
} from './systemPlan';
import { isPatchRecipeQuery, RECIPE_FIELD_KEYS, matchPcmTones } from './toneMatch';
import { validatePlan } from './validator';
import type { Gr55System } from '../devices/gr55/systemState';

export const ROUND_CAP = 3;

export type TurnState =
  'idle' | 'thinking' | 'proposal' | 'answer' | 'confirmLoad' | 'error' | 'needsKey' | 'stopped';

export interface LoadSlotAsk {
  label: string;
  bankMsb: number;
  programChange: number;
}

/** One bank-set step: select USER slot, then apply validated patch writes. */
export interface BankApplyStep {
  loadSlot: LoadSlotAsk;
  plan: ValidatedPlan;
  patchName: string;
  slotLabel: string;
}

export interface TurnResult {
  state: TurnState;
  reply?: string;
  intent?: string;
  plan?: ValidatedPlan;
  /** SYSTEM / GK writes (Global page only). */
  systemPlan?: SystemPlan;
  loadSlot?: LoadSlotAsk;
  /** Multi-key bank recipe — UI selects each slot then applies. */
  bankSteps?: BankApplyStep[];
  /** Local recipe compiler — UI may apply without an extra click. */
  autoApply?: boolean;
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
  /** Required for Global / SYSTEM recipes. */
  system?: Gr55System;
  locale: Locale;
  stageLive: boolean;
  /** Page scope: bank → patch only; system → SYSTEM only. */
  session?: SessionId;
  visiblePageId?: string;
  sourceNote: string;
  history?: readonly StoredMessage[];
  slots?: SlotResolver;
  getKey?: () => string | undefined;
}

function isBankSession(session: SessionId | undefined): boolean {
  // Default to bank when unset (legacy call sites / tests).
  return session === undefined || session === 'bank' || session === 'patch';
}

function isSystemSession(session: SessionId | undefined): boolean {
  return session === 'system';
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
  const hits = entries.filter(
    (entry) =>
      !entry.readOnly &&
      (entry.label.toLowerCase().includes(needle) ||
        entry.fieldKey.toLowerCase().includes(needle) ||
        entry.key.toLowerCase().includes(needle)),
  );
  if (isPatchRecipeQuery(query) || /tone|brass|harmonica|accordion|pcm|ctl|mute/i.test(query)) {
    const byKey = new Map(entries.map((entry) => [entry.key, entry]));
    for (const key of RECIPE_FIELD_KEYS) {
      const entry = byKey.get(key);
      if (entry && !entry.readOnly && !hits.includes(entry)) hits.push(entry);
    }
  }
  return hits;
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

function toneLabelsOf(deps: OrchestratorDeps): readonly string[] {
  return (
    deps.index.get('pcm1/tone/toneSelect')?.labels ??
    deps.entries.find((entry) => entry.fieldKey === 'toneSelect')?.labels ??
    []
  );
}

/**
 * One user turn: local recipe compiler when possible, else
 * context → provider (≤3 rounds for repair/search) → validate.
 */
export async function runTurn(text: string, deps: OrchestratorDeps): Promise<TurnResult> {
  abortActiveTurn();
  const controller = new AbortController();
  activeController = controller;

  if (deps.stageLive) {
    return {
      state: 'error',
      error: 'stageLive',
      errorCode: 'stageLive',
      rounds: 0,
    };
  }

  // Scope isolation: Bank never runs SYSTEM recipes; Global never runs patch recipes.
  if (isSystemSession(deps.session) && deps.system) {
    const gkRecipe = compileNylonPiezoGkRecipe(text);
    if (gkRecipe) {
      const systemPlan = validateSystemPlan(gkRecipe.changes, deps.system);
      if (systemPlan.accepted.length > 0) {
        return {
          state: 'proposal',
          reply: systemRecipeReply(gkRecipe, deps.locale),
          intent: gkRecipe.intent,
          systemPlan,
          autoApply: true,
          rounds: 0,
        };
      }
    }
  }

  if (isBankSession(deps.session)) {
    const labels = toneLabelsOf(deps);
    const bankSet = compileBankSoloSetRecipe(text, labels);
    if (bankSet) {
      const bankSteps: BankApplyStep[] = [];
      for (const step of bankSet.steps) {
        const resolved = deps.slots?.resolve(step.slotLabel) ?? deps.slots?.resolve(`USER ${step.slotLabel}`);
        if (!resolved) continue;
        const plan = validatePlan(step.changes, deps.index, deps.editor.readFormatted);
        if (plan.accepted.length + plan.clamped.length === 0) continue;
        bankSteps.push({
          loadSlot: resolved,
          plan,
          patchName: step.patchName,
          slotLabel: step.slotLabel,
        });
      }
      if (bankSteps.length > 0) {
        return {
          state: 'proposal',
          reply: bankRecipeReply(bankSet, deps.locale),
          intent: 'bank-solo-set',
          bankSteps,
          // First step also exposed for simple UIs.
          plan: bankSteps[0]?.plan,
          loadSlot: bankSteps[0]?.loadSlot,
          autoApply: true,
          rounds: 0,
        };
      }
    }

    const localRecipe = compileSoloGuitarRecipe(text, labels);
    if (localRecipe) {
      const plan = validatePlan(localRecipe.changes, deps.index, deps.editor.readFormatted);
      if (plan.accepted.length + plan.clamped.length > 0) {
        const slotLabel = localRecipe.targetSlot ?? localRecipe.writeSlot;
        const loadSlot = slotLabel
          ? deps.slots?.resolve(slotLabel) ?? deps.slots?.resolve(`USER ${slotLabel}`)
          : undefined;
        return {
          state: 'proposal',
          reply: recipeReply(localRecipe, deps.locale),
          intent: localRecipe.patchName,
          plan,
          loadSlot,
          autoApply: true,
          rounds: 0,
        };
      }
    }
  }

  // Wrong-scope recipe asks — refuse clearly without calling Gemini.
  if (isBankSession(deps.session) && compileNylonPiezoGkRecipe(text)) {
    return {
      state: 'answer',
      reply:
        deps.locale === 'pt-BR'
          ? 'Isso é configuração SYSTEM/GK (Global). Abra Global e peça de novo — no Bank eu só mexo no patch que está soando.'
          : 'That is SYSTEM/GK setup (Global). Open Global and ask again — on Bank I only edit the sounding patch.',
      rounds: 0,
    };
  }
  const patchRecipeOnSystem =
    isSystemSession(deps.session) &&
    (Boolean(compileBankSoloSetRecipe(text, toneLabelsOf(deps))) ||
      Boolean(compileSoloGuitarRecipe(text, toneLabelsOf(deps))));
  if (patchRecipeOnSystem) {
    return {
      state: 'answer',
      reply:
        deps.locale === 'pt-BR'
          ? 'Isso é receita de patch. Abra Bank e peça de novo — no Global eu só mexo em SYSTEM/GK.'
          : 'That is a patch recipe. Open Bank and ask again — on Global I only edit SYSTEM/GK.',
      rounds: 0,
    };
  }

  const getKey = deps.getKey ?? getApiKey;
  if (!getKey()) {
    return { state: 'needsKey', rounds: 0 };
  }

  let rounds = 0;
  const forcedFull = new Set<string>();

  const buildContext = (query: string) => {
    const request: ContextRequest = {
      query,
      patchName: deps.editor.patchName,
      sourceNote: deps.sourceNote,
      modeNote: deps.editor.gkMode,
      sessionNote: isSystemSession(deps.session)
        ? 'system (Global — SYSTEM/GK only)'
        : isBankSession(deps.session)
          ? 'bank (Bank — temporary patch only)'
          : undefined,
      visiblePageId: deps.visiblePageId,
    };
    if (isPatchRecipeQuery(query)) {
      for (const key of RECIPE_FIELD_KEYS) forcedFull.add(key);
    }
    const toneHits = matchPcmTones(query, toneLabelsOf(deps));
    const fields = assembleContext(deps.entries, deps.editor.readFormatted, request).map((field) => {
      const forced = forcedFull.has(field.entry.key)
        ? { ...field, depth: 'full' as const }
        : field;
      if (forced.entry.fieldKey === 'toneSelect' && toneHits.length > 0) {
        return { ...forced, enumCandidates: toneHits };
      }
      return forced;
    });
    for (const key of forcedFull) {
      if (!fields.some((field) => field.entry.key === key)) {
        const entry = deps.index.get(key);
        if (entry) {
          fields.push({
            entry,
            depth: 'full',
            value: deps.editor.readFormatted(entry),
            enumCandidates:
              entry.fieldKey === 'toneSelect' && toneHits.length > 0 ? toneHits : undefined,
          });
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

    // Global session: never accept temporary-patch change plans from the model.
    const plan =
      isBankSession(deps.session) &&
      (reply.kind === 'edit' || (reply.changes && reply.changes.length > 0))
        ? validatePlan(reply.changes ?? [], deps.index, deps.editor.readFormatted)
        : undefined;
    const hasEdits = !!plan && plan.accepted.length + plan.clamped.length > 0;

    if (isSystemSession(deps.session) && reply.kind === 'edit' && (reply.changes?.length ?? 0) > 0) {
      return {
        state: 'answer',
        reply:
          (reply.reply ? `${reply.reply}\n\n` : '') +
          (deps.locale === 'pt-BR'
            ? 'No Global eu só altero SYSTEM/GK (receitas locais ou controles da página). Campos de patch são ignorados.'
            : 'On Global I only change SYSTEM/GK (local recipes or page controls). Patch fields are ignored.'),
        intent: reply.intent,
        rounds,
      };
    }

    let loadSlot: LoadSlotAsk | undefined;
    if (reply.loadSlot?.trim() && isBankSession(deps.session)) {
      const label = reply.loadSlot.trim();
      const decision = decide(null, 'loadSlot', {
        stageLive: deps.stageLive,
        session: deps.session,
      });
      if (decision === 'deny' && !hasEdits) {
        return {
          state: 'error',
          reply: reply.reply,
          intent: reply.intent,
          error: 'loadSlot-denied',
          errorCode: 'loadSlot-denied',
          rounds,
        };
      }
      if (decision !== 'deny') {
        loadSlot = deps.slots?.resolve(label);
      }
    }

    // Prefer the edit plan for the sounding patch. loadSlot is optional chrome.
    if (hasEdits) {
      return {
        state: 'proposal',
        reply: reply.reply,
        intent: reply.intent,
        plan,
        loadSlot,
        rounds,
      };
    }

    if (loadSlot) {
      return {
        state: 'confirmLoad',
        reply: reply.reply,
        intent: reply.intent,
        loadSlot,
        rounds,
      };
    }

    if (reply.kind === 'edit' && plan) {
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
