import type { Locale } from '../copy';

export const HISTORY_CAP = 30;

export type HistoryRole = 'user' | 'assistant' | 'divider';

export interface HistoryMessage {
  role: HistoryRole;
  text: string;
  intent?: string;
  /** applied | rejected | discarded — outcome of a proposal turn. */
  outcome?: 'applied' | 'rejected' | 'discarded';
  at: number;
}

export interface HistoryThread {
  sourceKey: string;
  locale: Locale;
  stale?: { note: string };
  messages: HistoryMessage[];
}

export type PatchSourceLike =
  { kind: 'slot'; userPatchNumber: number } | { kind: 'file' } | undefined;

export function sourceKeyOf(
  patchSource: PatchSourceLike,
  patchName: string,
  anonEpoch: number = Date.now(),
): string {
  if (patchSource?.kind === 'slot') return `slot:${patchSource.userPatchNumber}`;
  if (patchName.trim()) return `patch:${patchName.trim()}`;
  return `anon:${anonEpoch}`;
}

function storageKey(locale: Locale, sourceKey: string): string {
  return `maestro.history.${locale}.${sourceKey}`;
}

function store(): Storage | undefined {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : undefined;
  } catch {
    return undefined;
  }
}

export function loadHistory(locale: Locale, sourceKey: string): HistoryThread {
  try {
    const raw = store()?.getItem(storageKey(locale, sourceKey));
    if (!raw) return { sourceKey, locale, messages: [] };
    const parsed = JSON.parse(raw) as HistoryThread;
    if (!parsed || !Array.isArray(parsed.messages)) {
      return { sourceKey, locale, messages: [] };
    }
    return {
      sourceKey,
      locale,
      stale: parsed.stale,
      messages: parsed.messages.slice(-HISTORY_CAP),
    };
  } catch {
    return { sourceKey, locale, messages: [] };
  }
}

export function saveHistory(thread: HistoryThread): void {
  try {
    const trimmed: HistoryThread = {
      ...thread,
      messages: thread.messages.slice(-HISTORY_CAP),
    };
    store()?.setItem(storageKey(thread.locale, thread.sourceKey), JSON.stringify(trimmed));
  } catch {
    // ignore
  }
}

export function appendMessage(
  thread: HistoryThread,
  message: Omit<HistoryMessage, 'at'> & { at?: number },
): HistoryThread {
  const next: HistoryThread = {
    ...thread,
    messages: [...thread.messages, { ...message, at: message.at ?? Date.now() }].slice(
      -HISTORY_CAP,
    ),
  };
  saveHistory(next);
  return next;
}

export function clearHistory(locale: Locale, sourceKey: string): void {
  try {
    store()?.removeItem(storageKey(locale, sourceKey));
  } catch {
    // ignore
  }
}

/** Mark the thread as stale when the patch or mode changes; keep messages. */
export function markStale(thread: HistoryThread, note: string): HistoryThread {
  const next: HistoryThread = { ...thread, stale: { note } };
  saveHistory(next);
  return next;
}
