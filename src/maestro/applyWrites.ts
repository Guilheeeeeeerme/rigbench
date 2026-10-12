import type { ValidatedItem, ValidatedPlan } from './contracts';
import type { RegistryEntry } from './fieldRegistry';
import { TEMPORARY_PATCH_ADDRESS } from '../devices/gr55/patchLayout';

export interface WriteEditor {
  writeAsync(field: RegistryEntry['ref'], value: unknown): Promise<void>;
  drainWrites(): Promise<void>;
  readPatch(): Promise<void>;
  read(field: RegistryEntry['ref']): { ok: true; value: unknown } | { ok: false; raw: Uint8Array };
}

export interface ApplyVerifyResult {
  written: number;
  verified: number;
  mismatches: string[];
}

function planItems(plan: ValidatedPlan): ValidatedItem[] {
  return [...plan.accepted, ...plan.clamped];
}

/**
 * Send every accepted/clamped change as DT1 (sequentially — parallel floods drop
 * on a real GR-55), wait for the write queue to drain, RQ1 the temporary patch,
 * and confirm values match. Callers must not advance to PATCH WRITE / the next
 * bank key until `mismatches` is empty.
 */
export async function applyPlanToPedal(
  editor: WriteEditor,
  plan: ValidatedPlan,
): Promise<ApplyVerifyResult> {
  const items = planItems(plan).filter(
    (item) => item.entry && item.coerced !== undefined && item.entry.ref.address >= TEMPORARY_PATCH_ADDRESS,
  );

  // One DT1 at a time. Promise.all + coalesce raced the pedal's RX buffer.
  for (const item of items) {
    await editor.writeAsync(item.entry!.ref, item.coerced);
  }
  await editor.drainWrites();
  await editor.readPatch();

  const mismatches: string[] = [];
  for (const item of items) {
    const entry = item.entry!;
    const got = editor.read(entry.ref);
    if (!got.ok) {
      mismatches.push(`${entry.key}: unreadable after write`);
      continue;
    }
    if (!valuesMatch(got.value, item.coerced)) {
      mismatches.push(
        `${entry.label ?? entry.key}: wanted ${formatVal(item.coerced)}, pedal has ${formatVal(got.value)}`,
      );
    }
  }

  return { written: items.length, verified: items.length - mismatches.length, mismatches };
}

function valuesMatch(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a === 'number' && typeof b === 'number') return a === b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return a === b;
  if (typeof a === 'string' && typeof b === 'string') return a.trim() === b.trim();
  return String(a) === String(b);
}

function formatVal(value: unknown): string {
  if (typeof value === 'string') return JSON.stringify(value);
  return String(value);
}
