import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SESSION, isSessionId, loadSession, saveSession, sessionChip } from './session';

describe('session model', () => {
  beforeEach(() => {
    saveSession(DEFAULT_SESSION);
  });

  it('defaults to Patch', () => {
    expect(DEFAULT_SESSION).toBe('patch');
    expect(loadSession()).toBe('patch');
  });

  it('keeps the session in memory only', () => {
    saveSession('system');
    expect(loadSession()).toBe('system');
  });

  it('guards ids and chips', () => {
    expect(isSessionId('library')).toBe(false);
    expect(isSessionId('stage')).toBe(false);
    expect(sessionChip('system')).toBe('🔵');
    expect(sessionChip('patch')).toBe('🟠');
  });
});
