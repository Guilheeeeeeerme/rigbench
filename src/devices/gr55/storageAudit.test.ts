import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { isAllowedStorageKey } from '../../session/storageAudit';

describe('setup is not stored in the browser', () => {
  test('locale is the only allowed key', () => {
    expect(isAllowedStorageKey('rigbench.locale')).toBe(true);
    expect(isAllowedStorageKey('rigbench.redux')).toBe(false);
    expect(isAllowedStorageKey('rigbench.recentTones')).toBe(false);
    expect(isAllowedStorageKey('rigbench.gr55.ports')).toBe(false);
    expect(isAllowedStorageKey('rigbench.fakeGr55.memory.v1')).toBe(false);
  });

  test('the store and the tone picker do not touch browser setup storage', () => {
    const store = readFileSync(new URL('../../app/store/store.ts', import.meta.url), 'utf8');
    const picker = readFileSync(new URL('./TonePicker.tsx', import.meta.url), 'utf8');
    const fake = readFileSync(new URL('./fakeDevice.ts', import.meta.url), 'utf8');
    expect(store.includes('localStorage')).toBe(false);
    expect(store.includes('redux-persist')).toBe(false);
    expect(picker.includes('localStorage')).toBe(false);
    expect(fake.includes('sessionStorage')).toBe(false);
    expect(fake.includes('indexedDB')).toBe(false);
  });
});
