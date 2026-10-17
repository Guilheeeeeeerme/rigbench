import type { MidiSession } from '../../midi/session';
import type { FieldReference, FieldType } from '../../protocol/RolandAddressMap';
import type { FieldValue } from './editor';
import { SYSTEM_ADDRESS, SYSTEM_BLOCKS, SYSTEM_SPAN } from './systemMap';

/**
 * The pedal-wide settings of a connected GR-55, mirrored in memory.
 *
 * Writes go to the pedal immediately (DT1). There is no staging / pending layer —
 * the mirror updates as the write leaves; callers re-read a full snapshot.
 */
export class Gr55System {
  /** Mirrored system bytes, indexed by offset from the start of the system area. */
  private readonly image = new Uint8Array(SYSTEM_SPAN);
  private readonly listeners = new Set<() => void>();
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

  /** Writes immediately to the pedal (DT1) and keeps the mirror aligned. */
  write<T>(field: FieldReference<FieldType<T>>, value: T): void {
    const offset = field.address - SYSTEM_ADDRESS;
    const { type, size } = field.definition;
    const bytes = new Uint8Array(size);
    type.encode(value, bytes, 0, size);
    this.image.set(bytes, offset);
    this.bump();
    void this.session.writeData(field.address, bytes, { coalesce: true });
  }

  private bump(): void {
    this.version++;
    for (const listener of this.listeners) {
      listener();
    }
  }
}
