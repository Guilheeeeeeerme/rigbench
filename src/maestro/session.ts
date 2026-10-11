/** Page scope for Maestro: Patch page vs Global page. */
export type SessionId = 'system' | 'patch' | 'library';

export const SESSION_IDS: readonly SessionId[] = ['system', 'patch'] as const;

export const DEFAULT_SESSION: SessionId = 'patch';

export function isSessionId(value: unknown): boolean {
  return value === 'system' || value === 'patch';
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
      return '🟠';
    case 'library':
      return '🟢';
  }
}
