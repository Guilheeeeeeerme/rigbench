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
 * Unlike a patch parameter, nothing here goes to the pedal as it is changed: edits are
 * staged, listed as changes, and sent only by apply(). A pedal-wide setting affects every
 * patch, so the musician sees exactly what will change before it does.
 */
export class Gr55System {
  /** The settings as staged here, indexed by offset from the start of the system area. */
  private readonly image = new Uint8Array(SYSTEM_SPAN);
  /** The settings as the pedal has them. */
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
  fieldSnapshot(): string {
    return String(this.version);
  }

  /** Reads the mapped stretches of the system area. Staged changes are dropped. */
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

  /** The value the pedal itself holds, whatever is staged. */
  readApplied<T>(field: FieldReference<FieldType<T>>): FieldValue<T> {
    const offset = field.address - SYSTEM_ADDRESS;
    const { type, size } = field.definition;
    try {
      return { ok: true, value: type.decode(this.baseline, offset, size) };
    } catch {
      return { ok: false, raw: this.baseline.slice(offset, offset + size) };
    }
  }

  /** Stages a change. Nothing reaches the pedal until apply(). */
  write<T>(field: FieldReference<FieldType<T>>, value: T): void {
    const offset = field.address - SYSTEM_ADDRESS;
    const { type, size } = field.definition;
    const bytes = new Uint8Array(size);
    type.encode(value, bytes, 0, size);
    this.image.set(bytes, offset);
    this.bump();
  }

  /** What apply() would change on the pedal, in words. */
  get changes(): SystemChange[] {
    return this.changedFields().map(({ reference, offset, size, gkSet: gkSetNumber }) => ({
      field: reference,
      gkSet: gkSetNumber,
      from: formatFieldBytes(reference, this.baseline.slice(offset, offset + size)),
      to: formatFieldBytes(reference, this.image.slice(offset, offset + size)),
    }));
  }

  get changeCount(): number {
    return this.changedFields().length;
  }

  /** Sends every staged change to the pedal. The caller owns the confirmation. */
  async apply(): Promise<void> {
    for (const { reference, offset, size } of this.changedFields()) {
      const bytes = this.image.slice(offset, offset + size);
      await this.session.writeData(reference.address, bytes);
      this.baseline.set(bytes, offset);
    }
    this.bump();
  }

  /** Puts backed-up system bytes back on the pedal, then reads it. The caller owns the confirm. */
  async restore(writes: readonly { offset: number; bytes: Uint8Array }[]): Promise<void> {
    for (const write of writes) {
      await this.session.writeData(SYSTEM_ADDRESS + write.offset, write.bytes);
    }
    await this.load();
  }

  /** Drops every staged change. */
  discard(): void {
    this.image.set(this.baseline);
    this.bump();
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
