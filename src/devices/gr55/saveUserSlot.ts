import type { Gr55Editor } from './editor';
import { assertSameUserSlot } from './patchGuard';

export type SaveUserSlotResult =
  | { ok: true; userPatchNumber: number }
  | {
      ok: false;
      reason: 'not-user-slot' | 'slot-changed' | 'verify-mismatch' | 'write-failed';
      expected?: number;
      actual?: number;
      message?: string;
      differences?: number;
    };

/**
 * Persist the temporary patch to a USER slot, then read the slot back and
 * compare against the working copy. Command handshake alone is not enough.
 */
export async function saveUserSlotVerified(
  editor: Gr55Editor,
  userPatchNumber: number,
): Promise<SaveUserSlotResult> {
  const guard = await assertSameUserSlot(editor, userPatchNumber);
  if (!guard.ok) {
    return guard;
  }

  try {
    const verified = await editor.writeToUserSlotVerified(userPatchNumber);
    if (!verified.ok) {
      return {
        ok: false,
        reason: 'verify-mismatch',
        expected: userPatchNumber,
        differences: verified.differences,
        message: `${verified.differences} parameter(s) differ after WRITE`,
      };
    }
    return { ok: true, userPatchNumber };
  } catch (error) {
    return {
      ok: false,
      reason: 'write-failed',
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
