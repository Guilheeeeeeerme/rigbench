import type { MidiSession } from '../../midi/session';
import type { FieldReference, FieldType } from '../../protocol/RolandAddressMap';
import { pack7 } from '../../protocol/RolandSysExProtocol';
import {
  GR55_MAP,
  PATCH_BLOCKS,
  PATCH_SPAN,
  TEMPORARY_PATCH_ADDRESS,
  userPatchAddress,
} from './patchLayout';
import { temporaryPatchFields, spansOverlapping, spanMatches } from './changeTracking';
import type { PatchFieldSpan } from './changeTracking';
import { decodePatchSyx, encodePatchSyx } from './syx';

export type GkMode = 'GUITAR' | 'BASS';

const PATCH_NAME = GR55_MAP.temporaryPatch.common.patchName;
const PATCH_NAME_OFFSET = PATCH_NAME.address - TEMPORARY_PATCH_ADDRESS;
const GUITAR_BASS_SELECT = GR55_MAP.system.common.guitarBassSelect;

// Writing the temporary patch to a user slot is a command, not a data write.
const WRITE_PATCH_COMMAND = pack7(0x0f000000);
const WRITE_PATCH_REPLIES = [pack7(0x0f000001), pack7(0x0f000002)];

// Time the pedal is given to switch patches before the new one is read back.
const PATCH_CHANGE_SETTLE_MS = 150;

// A slot that was never named holds bytes that are not printable characters.
function decodeName(bytes: Uint8Array, offset: number): string {
  const { type, size } = PATCH_NAME.definition;
  return type
    .decode(bytes, offset, size)
    .replace(/[^ -~]/g, ' ')
    .trimEnd();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type FieldValue<T> = { ok: true; value: T } | { ok: false; raw: Uint8Array };

/**
 * The temporary patch of a connected GR-55, mirrored in memory.
 * Edits update the mirror and go out as short DT1 messages; nothing here touches the
 * user slots except writeToUserSlot.
 */
export class Gr55Editor {
  /** Patch bytes indexed by offset from the start of the temporary patch. */
  private readonly image = new Uint8Array(PATCH_SPAN);
  /** The patch as it came from the pedal, to diff unsaved edits against. */
  private readonly baseline = new Uint8Array(PATCH_SPAN);
  private readonly listeners = new Set<() => void>();
  private readonly fieldVersions = new Map<number, number>();
  private readonly changeIndex: readonly PatchFieldSpan[];
  /** Addresses of fields whose bytes differ from the baseline. */
  private readonly dirty = new Set<number>();
  private epoch = 0;
  private dirtyEpoch = 0;
  private reloadTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly unsubscribe: (() => void)[];

  gkMode: GkMode = 'GUITAR';
  /** Unsaved edits lost when the pedal changed patches on its own, until the app shows it. */
  discardedChanges: number | undefined;
  /** Increments every time discardedChanges is written, so the app can tell new notices apart. */
  discardSequence = 0;

  constructor(
    private readonly session: MidiSession,
    private readonly onBackgroundError: (error: unknown) => void = () => {},
  ) {
    this.changeIndex = temporaryPatchFields();
    this.unsubscribe = [
      // A parameter changed on the pedal itself.
      session.onData((address, bytes) => this.applyRemoteData(address, bytes)),
      // A patch selected on the pedal: program change on any channel.
      session.onChannelMessage((data) => {
        if ((data[0] & 0xf0) === 0xc0) {
          this.scheduleReload();
        }
      }),
    ];
  }

  dispose(): void {
    clearTimeout(this.reloadTimer);
    for (const unsubscribe of this.unsubscribe) {
      unsubscribe();
    }
    this.listeners.clear();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Changes whenever the bytes behind a field may have changed. */
  fieldSnapshot(address: number): string {
    return `${this.epoch}:${this.fieldVersions.get(address) ?? 0}`;
  }

  patchSnapshot = (): number => this.epoch;

  /** Changes when the set of unsaved changes may have changed. */
  dirtySnapshot = (): string => `${this.epoch}:${this.dirtyEpoch}`;

  /** How many fields of the working copy differ from what the pedal had. */
  get changeCount(): number {
    return this.dirty.size;
  }

  get isDirty(): boolean {
    return this.dirty.size > 0;
  }

  async readSystem(): Promise<void> {
    const bytes = await this.session.requestData(
      GUITAR_BASS_SELECT.address,
      GUITAR_BASS_SELECT.definition.size,
    );
    this.gkMode = GUITAR_BASS_SELECT.definition.type.decode(bytes, 0, bytes.length) as GkMode;
    this.notify();
  }

  async readPatch(onProgress?: (done: number, total: number) => void): Promise<void> {
    const next = new Uint8Array(PATCH_SPAN);
    let done = 0;
    await Promise.all(
      PATCH_BLOCKS.map(async (block) => {
        const bytes = await this.session.requestData(
          TEMPORARY_PATCH_ADDRESS + block.offset,
          block.length,
        );
        next.set(bytes, block.offset);
        onProgress?.(++done, PATCH_BLOCKS.length);
      }),
    );
    this.image.set(next);
    this.baseline.set(next);
    this.dirty.clear();
    this.dirtyEpoch++;
    this.bumpEpoch();
  }

  read<T>(field: FieldReference<FieldType<T>>): FieldValue<T> {
    const offset = field.address - TEMPORARY_PATCH_ADDRESS;
    const { type, size } = field.definition;
    try {
      return { ok: true, value: type.decode(this.image, offset, size) };
    } catch {
      // A byte the map has no label for. Show it raw instead of failing the page.
      return { ok: false, raw: this.image.slice(offset, offset + size) };
    }
  }

  write<T>(field: FieldReference<FieldType<T>>, value: T): void {
    const offset = field.address - TEMPORARY_PATCH_ADDRESS;
    const { type, size } = field.definition;
    const bytes = new Uint8Array(size);
    type.encode(value, bytes, 0, size);
    this.image.set(bytes, offset);
    this.reconcile(offset, size);
    this.bumpField(field.address);
    this.session.writeData(field.address, bytes, { coalesce: true }).catch(this.onBackgroundError);
  }

  /** Sends the baseline back to the pedal for every changed field, then reloads the copy. */
  async revert(): Promise<void> {
    const writes: Promise<void>[] = [];
    const changed = [...this.dirty];
    for (const address of changed) {
      const field = this.changeIndex.find((candidate) => candidate.address === address);
      if (!field) {
        continue;
      }
      const bytes = this.baseline.slice(field.offset, field.offset + field.size);
      this.image.set(bytes, field.offset);
      writes.push(this.session.writeData(address, bytes));
    }
    await Promise.all(writes);
    this.dirty.clear();
    this.dirtyEpoch++;
    this.bumpEpoch();
  }

  get patchName(): string {
    return decodeName(this.image, PATCH_NAME_OFFSET);
  }

  /** Makes the pedal switch patches, then reads the new temporary patch. */
  async selectPatch(bankMsb: number, programChange: number): Promise<void> {
    // A write to the setup page instead of a program change: it works whatever screen
    // the pedal is on and whatever its PC RX switch says.
    await this.session.writeData(GR55_MAP.setup.patchBsMsb.address, [bankMsb]);
    await this.session.writeData(GR55_MAP.setup.patchPc.address, [programChange]);
    await delay(PATCH_CHANGE_SETTLE_MS);
    await this.readPatch();
  }

  /** Overwrites a user slot on the pedal with the temporary patch. The pedal then selects it. */
  async writeToUserSlot(userPatchNumber: number): Promise<void> {
    const msb = Math.floor(userPatchNumber / 128);
    const programChange = userPatchNumber % 128;
    await this.session.command(
      WRITE_PATCH_COMMAND,
      [msb, 0x00, programChange, 0x7f],
      WRITE_PATCH_REPLIES,
    );
  }

  async readUserPatchName(userPatchNumber: number): Promise<string> {
    const bytes = await this.session.requestData(
      userPatchAddress(userPatchNumber) + PATCH_NAME_OFFSET,
      PATCH_NAME.definition.size,
    );
    return decodeName(bytes, 0);
  }

  exportSyx(): Uint8Array {
    return encodePatchSyx(this.image);
  }

  /** Sends the patch in a .syx file to the temporary patch, then reads it back. */
  async importSyx(file: Uint8Array): Promise<void> {
    const writes = decodePatchSyx(file);
    await Promise.all(
      writes.map((write) =>
        this.session.writeData(TEMPORARY_PATCH_ADDRESS + write.offset, write.bytes),
      ),
    );
    await this.readPatch();
  }

  private applyRemoteData(address: number, bytes: Uint8Array): void {
    const offset = address - TEMPORARY_PATCH_ADDRESS;
    if (offset < 0 || offset + bytes.length > PATCH_SPAN) {
      return;
    }
    this.image.set(bytes, offset);
    this.reconcile(offset, bytes.length);
    this.bumpEpoch();
  }

  private scheduleReload(): void {
    clearTimeout(this.reloadTimer);
    this.reloadTimer = setTimeout(() => {
      // The pedal has already left the old working copy behind; record how much was
      // in it so the app can say what was lost.
      if (this.isDirty) {
        this.discardedChanges = this.changeCount;
        this.discardSequence++;
      }
      this.readPatch().catch(this.onBackgroundError);
    }, PATCH_CHANGE_SETTLE_MS);
  }

  /** Re-evaluates which fields in a byte range now differ from the baseline. */
  private reconcile(offset: number, size: number): void {
    const before = this.dirty.size;
    for (const field of spansOverlapping(this.changeIndex, offset, size)) {
      if (spanMatches(this.image, this.baseline, field.offset, field.size)) {
        this.dirty.delete(field.address);
      } else {
        this.dirty.add(field.address);
      }
    }
    if (this.dirty.size !== before) {
      this.dirtyEpoch++;
    }
  }

  private bumpField(address: number): void {
    this.fieldVersions.set(address, (this.fieldVersions.get(address) ?? 0) + 1);
    this.notify();
  }

  private bumpEpoch(): void {
    this.epoch++;
    this.fieldVersions.clear();
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
