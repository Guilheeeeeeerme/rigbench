import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SESSION, isSessionId, loadSession, saveSession, sessionChip } from './session';

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    key: (index: number) => [...map.keys()][index] ?? null,
  };
}

describe('session model', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: memoryStorage(),
    });
  });

  it('defaults to Patch', () => {
    expect(DEFAULT_SESSION).toBe('patch');
    expect(loadSession()).toBe('patch');
  });

  it('persists and loads a session', () => {
    saveSession('system');
    expect(loadSession()).toBe('system');
  });

  it('guards ids and chips', () => {
    expect(isSessionId('library')).toBe(true);
    expect(isSessionId('stage')).toBe(false);
    expect(sessionChip('system')).toBe('🔵');
    expect(sessionChip('patch')).toBe('🟠');
    expect(sessionChip('library')).toBe('🟢');
  });
});
