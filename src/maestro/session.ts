/** Page scope for Maestro: Bank page, Global page, or legacy library. */
export type SessionId = 'system' | 'patch' | 'bank' | 'library';

export const SESSION_IDS: readonly SessionId[] = ['system', 'bank'] as const;

export const DEFAULT_SESSION: SessionId = 'bank';

export function isSessionId(value: unknown): boolean {
  return value === 'system' || value === 'patch' || value === 'bank';
}

/** In-memory only — never persist pedal or session config to localStorage. */
let current: SessionId = DEFAULT_SESSION;

export function loadSession(): SessionId {
  return current;
}

export function saveSession(session: SessionId): void {
  current = session;
}

/** Scope chip glyph used in chrome. */
export function sessionChip(session: SessionId): '🔵' | '🟠' | '🟢' {
  switch (session) {
    case 'system':
      return '🔵';
    case 'patch':
    case 'bank':
      return '🟠';
    case 'library':
      return '🟢';
  }
}

/** Macro groups keyed as patch also apply on the Bank page. */
export function macroSessionOf(session: SessionId): 'system' | 'patch' | 'library' {
  if (session === 'bank' || session === 'patch') {
    return 'patch';
  }
  if (session === 'system') {
    return 'system';
  }
  return 'library';
}
