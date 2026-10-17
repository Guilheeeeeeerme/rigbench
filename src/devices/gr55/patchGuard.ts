import type { Gr55Editor, PatchSource } from './editor';

export type PatchIdentity = { userPatchNumber: number };

export type PatchGuardResult =
  | { ok: true; identity: PatchIdentity }
  | { ok: false; reason: 'not-user-slot' | 'slot-changed'; expected?: number; actual?: number };

/** Snapshot of which USER slot the editor believes is active. */
export function expectedUserSlot(source: PatchSource | undefined): number | undefined {
  return source?.kind === 'slot' ? source.userPatchNumber : undefined;
}

/**
 * Re-reads pedal location and compares it to the expected USER slot.
 * Call before apply/save so we never write into the wrong patch.
 */
export async function assertSameUserSlot(
  editor: Gr55Editor,
  expected: number,
): Promise<PatchGuardResult> {
  await editor.readPatchLocation();
  const actual = expectedUserSlot(editor.patchSource);
  if (actual === undefined) {
    return { ok: false, reason: 'not-user-slot' };
  }
  if (actual !== expected) {
    return { ok: false, reason: 'slot-changed', expected, actual };
  }
  return { ok: true, identity: { userPatchNumber: actual } };
}

export async function requireCurrentUserSlot(editor: Gr55Editor): Promise<PatchGuardResult> {
  const expected = expectedUserSlot(editor.patchSource);
  if (expected === undefined) {
    await editor.readPatchLocation();
    const actual = expectedUserSlot(editor.patchSource);
    if (actual === undefined) {
      return { ok: false, reason: 'not-user-slot' };
    }
    return { ok: true, identity: { userPatchNumber: actual } };
  }
  return assertSameUserSlot(editor, expected);
}
