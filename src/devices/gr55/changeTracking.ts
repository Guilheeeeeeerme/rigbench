import { FieldDefinition, ReservedField, StructDefinition } from '../../protocol/RolandAddressMap';
import type { AtomReference, FieldReference } from '../../protocol/RolandAddressMap';
import { TEMPORARY_PATCH, TEMPORARY_PATCH_ADDRESS } from './patchLayout';

export type Scope = 'working-copy' | 'system';

/** One named field of the temporary patch, located as an absolute device address. */
export interface PatchFieldSpan {
  address: number;
  /** Byte offset inside the temporary patch. */
  offset: number;
  size: number;
  reference: FieldReference;
}

function childMembers(struct: unknown): AtomReference[] {
  const keys = Object.keys((struct as { definition: { $: Record<string, unknown> } }).definition.$);
  return keys.map((key) => (struct as Record<string, unknown>)[key] as AtomReference);
}

function compareBytes(a: Uint8Array, b: Uint8Array, start: number, end: number): boolean {
  for (let index = start; index < end; index++) {
    if (a[index] !== b[index]) {
      return false;
    }
  }
  return true;
}

/** Compares one span of the current image against the baseline image. */
export function spanMatches(
  current: Uint8Array,
  baseline: Uint8Array,
  offset: number,
  size: number,
): boolean {
  return compareBytes(current, baseline, offset, offset + size);
}

function collect(atom: unknown, out: PatchFieldSpan[]): void {
  const definition = (atom as { definition?: unknown }).definition;
  if (definition instanceof FieldDefinition) {
    if (!(definition.type instanceof ReservedField)) {
      const reference = atom as FieldReference;
      out.push({
        address: reference.address,
        offset: reference.address - TEMPORARY_PATCH_ADDRESS,
        size: reference.definition.size,
        reference: reference as FieldReference,
      });
    }
    return;
  }
  if (definition instanceof StructDefinition) {
    for (const member of childMembers(atom)) {
      collect(member, out);
    }
  }
}

/**
 * Every named, addressable field of the temporary patch, deduplicated and in address
 * order. This is the index the editor diffs local edits and pedal messages against.
 */
export function temporaryPatchFields(): PatchFieldSpan[] {
  const fields: PatchFieldSpan[] = [];
  collect(TEMPORARY_PATCH, fields);
  const byAddress = new Map<number, PatchFieldSpan>();
  for (const field of fields) {
    byAddress.set(field.address, field);
  }
  return [...byAddress.values()].sort((a, b) => a.offset - b.offset);
}

/**
 * The spans that overlap the given range, using a list sorted by offset.
 * Looking up a position only ever revisits one field at a time, so a linear walk
 * backward before the range converges on the candidates.
 */
export function spansOverlapping(
  fields: readonly PatchFieldSpan[],
  offset: number,
  size: number,
): PatchFieldSpan[] {
  const end = offset + size;
  const hits: PatchFieldSpan[] = [];
  let start = 0;
  while (start < fields.length && fields[start].offset + fields[start].size <= offset) {
    start++;
  }
  for (let index = start; index < fields.length; index++) {
    const field = fields[index];
    if (field.offset >= end) {
      break;
    }
    if (field.offset + field.size > offset) {
      hits.push(field);
    }
  }
  return hits;
}

export function scopeOf(fieldAddress: number): Scope {
  return fieldAddress >= TEMPORARY_PATCH_ADDRESS ? 'working-copy' : 'system';
}
