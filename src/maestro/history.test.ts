import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  HISTORY_CAP,
  appendMessage,
  clearHistory,
  loadHistory,
  markStale,
  sourceKeyOf,
} from './history';

function fakeStorage() {
  const items = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  });
  return items;
}

describe('history', () => {
  beforeEach(() => void fakeStorage());
  afterEach(() => vi.unstubAllGlobals());

  it('keys by slot, patch name, or anon', () => {
    expect(sourceKeyOf({ kind: 'slot', userPatchNumber: 14 }, 'X')).toBe('slot:14');
    expect(sourceKeyOf({ kind: 'file' }, 'Blues')).toBe('patch:Blues');
    expect(sourceKeyOf(undefined, '', 99)).toBe('anon:99');
  });

  it('caps at 30 messages', () => {
    let thread = loadHistory('en', 'slot:1');
    for (let i = 0; i < HISTORY_CAP + 5; i++) {
      thread = appendMessage(thread, { role: 'user', text: `m${i}` });
    }
    expect(thread.messages).toHaveLength(HISTORY_CAP);
    expect(thread.messages[0].text).toBe('m5');
  });

  it('clears a conversation', () => {
    appendMessage(loadHistory('en', 'slot:2'), { role: 'user', text: 'hi' });
    clearHistory('en', 'slot:2');
    expect(loadHistory('en', 'slot:2').messages).toEqual([]);
  });

  it('marks a thread stale on patch switch', () => {
    const thread = appendMessage(loadHistory('en', 'slot:3'), { role: 'user', text: 'hi' });
    markStale(thread, 'this talk was about Blues Riff (U14:2)');
    expect(loadHistory('en', 'slot:3').stale?.note).toContain('Blues Riff');
  });
});
