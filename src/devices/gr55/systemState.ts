import type { MidiSession } from '../../midi/session';
import { FieldDefinition, ReservedField, StructDefinition } from '../../protocol/RolandAddressMap';
import type { FieldReference, FieldType } from '../../protocol/RolandAddressMap';
import { formatFieldBytes } from './editor';
import type { FieldValue } from './editor';
import {
  GK_SET_COUNT,
  SYSTEM,
  SYSTEM_ADDRESS,
  SYSTEM_BLOCKS,
  SYSTEM_SPAN,
  gkSet,
} from './systemMap';

/** One pedal-wide setting changed here and not yet applied to the pedal. */
export interface SystemChange {
  field: FieldReference;
  /** GK set 1–10 the field belongs to, when it is a GK set field. */
  gkSet?: number;
  from: string;
  to: string;
}

interface SystemField {
  reference: FieldReference;
  offset: number;
  size: number;
  gkSet?: number;
}

function collect(atom: unknown, gkSetNumber: number | undefined, out: SystemField[]): void {
  const definition = (atom as { definition?: unknown }).definition;
  if (definition instanceof FieldDefinition) {
    if (!(definition.type instanceof ReservedField)) {
      const reference = atom as FieldReference;
      out.push({
        reference,
        offset: reference.address - SYSTEM_ADDRESS,
        size: reference.definition.size,
        gkSet: gkSetNumber,
      });
    }
  } else if (definition instanceof StructDefinition) {
    for (const key of Object.keys(definition.$)) {
      collect((atom as Record<string, unknown>)[key], gkSetNumber, out);
    }
  }
}

function systemFields(): SystemField[] {
  const fields: SystemField[] = [];
  collect(SYSTEM.common, undefined, fields);
  collect(SYSTEM.pedals, undefined, fields);
  for (let number = 1; number <= GK_SET_COUNT; number++) {
    collect(gkSet(number), number, fields);
  }
  return fields;
}

/**
 * The pedal-wide settings of a connected GR-55, mirrored in memory.
 *
 * Writes go to the pedal immediately (DT1). There is no staging / pending layer —
 * image and baseline stay aligned after each write; callers re-read a full snapshot.
 */
export class Gr55System {
  /** Mirrored system bytes, indexed by offset from the start of the system area. */
  private readonly image = new Uint8Array(SYSTEM_SPAN);
  /** Same as image after each immediate write or load (kept for backup helpers). */
  private readonly baseline = new Uint8Array(SYSTEM_SPAN);
  private readonly listeners = new Set<() => void>();
  private readonly fields = systemFields();
  private version = 0;
  loaded = false;
  private loading: Promise<void> | undefined;

  constructor(private readonly session: MidiSession) {}

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  snapshot = (): number => this.version;

  /** Same contract as the patch editor's, so the same controls can show a system field. */
  fieldSnapshot(_address?: number): string {
    return String(this.version);
  }

  /** Reads the mapped stretches of the system area. */
  load(): Promise<void> {
    // Two screens asking at once share one read.
    this.loading ??= this.readAll().finally(() => {
      this.loading = undefined;
    });
    return this.loading;
  }

  private async readAll(): Promise<void> {
    const next = new Uint8Array(SYSTEM_SPAN);
    // Asked for together, so they queue as one run and a sync in progress cannot slip a
    // whole slot between each of them.
    await Promise.all(
      SYSTEM_BLOCKS.map(async (block) => {
        next.set(
          await this.session.requestData(SYSTEM_ADDRESS + block.offset, block.length),
          block.offset,
        );
      }),
    );
    this.image.set(next);
    this.baseline.set(next);
    this.loaded = true;
    this.bump();
  }

  read<T>(field: FieldReference<FieldType<T>>): FieldValue<T> {
    const offset = field.address - SYSTEM_ADDRESS;
    const { type, size } = field.definition;
    try {
      return { ok: true, value: type.decode(this.image, offset, size) };
    } catch {
      return { ok: false, raw: this.image.slice(offset, offset + size) };
    }
  }

  /** Same as read() — no staging layer. */
  readApplied<T>(field: FieldReference<FieldType<T>>): FieldValue<T> {
    return this.read(field);
  }

  /** Writes immediately to the pedal (DT1) and keeps the mirror aligned. */
  write<T>(field: FieldReference<FieldType<T>>, value: T): void {
    const offset = field.address - SYSTEM_ADDRESS;
    const { type, size } = field.definition;
    const bytes = new Uint8Array(size);
    type.encode(value, bytes, 0, size);
    this.image.set(bytes, offset);
    this.baseline.set(bytes, offset);
    this.bump();
    void this.session.writeData(field.address, bytes, { coalesce: true });
  }

  /** Empty — immediate writes leave no pending diff. */
  get changes(): SystemChange[] {
    return [];
  }

  get changeCount(): number {
    return 0;
  }

  /** No-op: writes already reached the pedal. Kept for older call sites. */
  async apply(): Promise<void> {
    // Intentionally empty.
  }

  /** Puts backed-up system bytes back on the pedal, then reads it. The caller owns the confirm. */
  async restore(writes: readonly { offset: number; bytes: Uint8Array }[]): Promise<void> {
    for (const write of writes) {
      await this.session.writeData(SYSTEM_ADDRESS + write.offset, write.bytes);
    }
    await this.load();
  }

  /** No-op: there is no staging layer. */
  discard(): void {
    // Intentionally empty.
  }

  /** The mirrored stretch of the system area as the pedal has it, for a backup file. */
  appliedBytes(): Uint8Array {
    return this.baseline.slice();
  }

  private changedFields(): SystemField[] {
    return this.fields.filter(({ offset, size }) => {
      for (let index = offset; index < offset + size; index++) {
        if (this.image[index] !== this.baseline[index]) {
          return true;
        }
      }
      return false;
    });
  }

  private bump(): void {
    this.version++;
    for (const listener of this.listeners) {
      listener();
    }
  }
}
