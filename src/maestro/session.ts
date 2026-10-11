/** Craft sessions shared by Studio chat and macro panels. */
export type SessionId = 'system' | 'patch' | 'library';

export const SESSION_IDS: readonly SessionId[] = ['system', 'patch'] as const;

export const DEFAULT_SESSION: SessionId = 'patch';

const STORAGE_KEY = 'rigbench.gr55.studioSession';

export function isSessionId(value: unknown): boolean {
  return value === 'system' || value === 'patch';
}

/** Last session for this browser; defaults to Patch (craft-first). */
export function loadSession(): SessionId {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'system' || raw === 'patch') {
      return raw;
    }
  } catch {
    // Private mode / tests.
  }
  return DEFAULT_SESSION;
}

export function saveSession(session: SessionId): void {
  try {
    localStorage.setItem(STORAGE_KEY, session);
  } catch {
    // Choice still holds for this visit via React state.
  }
}

/** Scope chip glyph used in chrome (manual SYSTEM / PATCH / Library). */
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
