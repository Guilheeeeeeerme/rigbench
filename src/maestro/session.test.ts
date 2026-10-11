import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_SESSION,
  isSessionId,
  loadSession,
  macroSessionOf,
  saveSession,
  sessionChip,
} from './session';

describe('session model', () => {
  beforeEach(() => {
    saveSession(DEFAULT_SESSION);
  });

  it('defaults to Bank', () => {
    expect(DEFAULT_SESSION).toBe('bank');
    expect(loadSession()).toBe('bank');
  });

  it('keeps the session in memory only', () => {
    saveSession('system');
    expect(loadSession()).toBe('system');
  });

  it('guards ids and chips', () => {
    expect(isSessionId('library')).toBe(false);
    expect(isSessionId('stage')).toBe(false);
    expect(isSessionId('bank')).toBe(true);
    expect(sessionChip('system')).toBe('🔵');
    expect(sessionChip('bank')).toBe('🟠');
    expect(sessionChip('patch')).toBe('🟠');
  });

  it('maps bank onto patch macros', () => {
    expect(macroSessionOf('bank')).toBe('patch');
    expect(macroSessionOf('patch')).toBe('patch');
    expect(macroSessionOf('system')).toBe('system');
  });
});
