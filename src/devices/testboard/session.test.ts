import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { createTestSession } from './session';

describe('a second adapter runs the same intentions', () => {
  test('the experience does not import a device or SysEx', () => {
    const source = readFileSync(new URL('../../experience/IntentionWorkspace.tsx', import.meta.url), 'utf8');
    expect(source).not.toMatch(/from ['"][^'"]*gr55/);
    expect(source).not.toMatch(/SysEx/);
    expect(source).not.toMatch(/if\s*\(\s*gr55/);
  });

  test('recipes land on the confirmed mirror and a busy control is refused', async () => {
    const session = createTestSession();
    const harmonica = await session.apply({ kind: 'recipe', id: 'nylon-harmonica-exp' });
    expect(harmonica).toEqual({ ok: true });
    expect(session.getState().confirmed?.recipeId).toBe('nylon-harmonica-exp');
    expect(session.getState().confirmed?.expression).toBe('layer-1');

    const piano = await session.apply({ kind: 'recipe', id: 'nylon-piano-strings-ctl' });
    expect(piano).toEqual({ ok: true });
    expect(session.getState().confirmed?.layers[1]?.toneName).toBe('Strings');
    expect(session.getState().confirmed?.recipeId).toBeNull();

    const fresh = createTestSession();
    fresh.getState().confirmed!.ctl = 'other';
    const refused = await fresh.apply({ kind: 'recipe', id: 'nylon-piano-strings-ctl' });
    expect(refused).toEqual({ ok: false, code: 'refused', control: 'ctl' });
    expect(fresh.getState().confirmed?.layers[0]?.on).toBe(false);
  });
});
