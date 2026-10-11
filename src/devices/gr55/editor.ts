import type { MidiSession } from '../../midi/session';
import { isBooleanField, isNumericField } from '../../protocol/RolandAddressMap';
import type { FieldReference, FieldType } from '../../protocol/RolandAddressMap';
import { BULK_DATA_TRANSFER_SIZE_PER_MESSAGE, pack7 } from '../../protocol/RolandSysExProtocol';
import {
  GR55_MAP,
  PATCH_BLOCKS,
  PATCH_SPAN,
  TEMPORARY_PATCH_ADDRESS,
  USER_PATCH_COUNT,
  userPatchAddress,
} from './patchLayout';
import { temporaryPatchFields, spansOverlapping, spanMatches } from './changeTracking';
import type { PatchFieldSpan } from './changeTracking';
import { isPedalAuthority } from './sessionAuthority';
import { decodePatchSyx, encodePatchSyx } from './syx';

export type GkMode = 'GUITAR' | 'BASS';

/** Where the working copy came from. Only a slot copy can be saved straight back. */
export type PatchSource = { kind: 'slot'; userPatchNumber: number } | { kind: 'file' };

/** One parameter that differs between the working copy and a user slot. */
export interface SlotDiffEntry {
  description: string;
  current: string;
  slot: string;
}

const PATCH_NAME = GR55_MAP.temporaryPatch.common.patchName;
const PATCH_NAME_OFFSET = PATCH_NAME.address - TEMPORARY_PATCH_ADDRESS;
const GUITAR_BASS_SELECT = GR55_MAP.system.common.guitarBassSelect;

// Writing the temporary patch to a user slot is a command, not a data write.
const WRITE_PATCH_COMMAND = pack7(0x0f000000);
const WRITE_PATCH_REPLIES = [pack7(0x0f000001), pack7(0x0f000002)];

// Real GR-55 patch changes mute and reload the temp buffer for ~1s. 150ms was
// short enough that Maestro DT1s landed mid-reload and were overwritten.
const DEFAULT_PATCH_CHANGE_SETTLE_MS = 1200;

// The system bytes the app knows: offsets 00..1a of the system area, mode included.
const SYSTEM_BACKUP_SPAN = 0x1b;

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

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((byte, index) => byte === b[index]);
}

/** The value of one field's bytes, in words instead of raw numbers when the map allows. */
export function formatFieldBytes(field: FieldReference, bytes: Uint8Array): string {
  try {
    const { type, size } = field.definition;
    const value = type.decode(bytes, 0, size);
    if (typeof value === 'string') {
      return value.trim();
    }
    if (isBooleanField(type)) {
      return value ? type.trueLabel : type.falseLabel;
    }
    if (isNumericField(type)) {
      return type.format(value);
    }
    // Enum fields decode straight to their label.
    return String(value);
  } catch {
    return hexBytes(bytes);
  }
}

function hexBytes(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join(' ');
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
  private readonly patchChangeSettleMs: number;

  gkMode: GkMode = 'GUITAR';
  /** Where the current working copy came from, if the app knows. */
  patchSource: PatchSource | undefined;
  /** Unsaved edits lost when the pedal changed patches on its own, until the app shows it. */
  discardedChanges: number | undefined;
  /** Increments every time discardedChanges is written, so the app can tell new notices apart. */
  discardSequence = 0;

  constructor(
    private readonly session: MidiSession,
    private readonly onBackgroundError: (error: unknown) => void = () => {},
    options?: { patchChangeSettleMs?: number },
  ) {
    this.patchChangeSettleMs = options?.patchChangeSettleMs ?? DEFAULT_PATCH_CHANGE_SETTLE_MS;
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

  /**
   * Writes GUITAR/BASS to the pedal's system page. The caller owns the impact modal:
   * this remakes the whole patch map, changing what every one of the 297 slots means.
   */
  async setGuitarBassMode(mode: GkMode): Promise<void> {
    await this.session.writeData(GUITAR_BASS_SELECT.address, [mode === 'BASS' ? 1 : 0]);
    this.gkMode = mode;
    this.patchSource = undefined;
    this.notify();
  }

  /**
   * Reads the start of the system area — the part the map defines, mode switch
   * included. Enough for a small, honest system backup.
   */
  async readSystemBytes(): Promise<Uint8Array> {
    const base = GR55_MAP.system.address;
    return this.session.requestData(base, SYSTEM_BACKUP_SPAN);
  }

  /** The absolute address and span of the system block behind readSystemBytes. */
  systemAddress(): number {
    return GR55_MAP.system.address;
  }

  systemSpan(): number {
    return SYSTEM_BACKUP_SPAN;
  }

  /** Puts a system block back exactly as it was read. The caller owns the confirm. */
  async writeSystemBytes(bytes: Uint8Array): Promise<void> {
    const base = GR55_MAP.system.address;
    for (let offset = 0; offset < bytes.length; offset += BULK_DATA_TRANSFER_SIZE_PER_MESSAGE) {
      await this.session.writeData(
        base + offset,
        bytes.slice(offset, Math.min(offset + BULK_DATA_TRANSFER_SIZE_PER_MESSAGE, bytes.length)),
      );
    }
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
    void this.writeAsync(field, value).catch(this.onBackgroundError);
  }

  /**
   * Same as {@link write}, but the promise resolves only after the DT1 has been
   * sent on the MIDI wire (or coalesced into a later send for the same address).
   */
  writeAsync<T>(field: FieldReference<FieldType<T>>, value: T): Promise<void> {
    const offset = field.address - TEMPORARY_PATCH_ADDRESS;
    const { type, size } = field.definition;
    const bytes = new Uint8Array(size);
    type.encode(value, bytes, 0, size);
    this.image.set(bytes, offset);
    // Align baseline so the app has no “pending” local dirty state; snapshot follows.
    this.baseline.set(bytes, offset);
    this.dirty.delete(field.address);
    this.dirtyEpoch++;
    this.bumpField(field.address);
    return this.session.writeData(field.address, bytes, { coalesce: true });
  }

  /** Block until every pending coalesced DT1 has left the session write queue. */
  drainWrites(): Promise<void> {
    return this.session.drainWriteQueue();
  }

  /** The working copy now lives in a slot as-is: reuse it as the new diff baseline. */
  markSaved(): void {
    this.baseline.set(this.image);
    this.dirty.clear();
    this.dirtyEpoch++;
    this.notify();
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

  /**
   * Reads which user slot the pedal has selected (setup BS MSB + PC) and sets
   * patchSource when that pair maps onto a user slot.
   */
  async readPatchLocation(): Promise<void> {
    const [msb] = await this.session.requestData(GR55_MAP.setup.patchBsMsb.address, 1);
    const [programChange] = await this.session.requestData(GR55_MAP.setup.patchPc.address, 1);
    const userPatchNumber = msb * 128 + programChange;
    if (msb <= 2 && userPatchNumber < USER_PATCH_COUNT) {
      this.patchSource = { kind: 'slot', userPatchNumber };
    } else {
      this.patchSource = undefined;
    }
    this.notify();
  }

  /** Makes the pedal switch patches, then reads the new temporary patch. */
  async selectPatch(bankMsb: number, programChange: number): Promise<void> {
    // A write to the setup page instead of a program change: it works whatever screen
    // the pedal is on and whatever its PC RX switch says.
    await this.session.writeData(GR55_MAP.setup.patchBsMsb.address, [bankMsb]);
    await this.session.writeData(GR55_MAP.setup.patchPc.address, [programChange]);
    await delay(this.patchChangeSettleMs);
    // User slots select this exact way; anything else (a screen switch) is unknowable.
    this.patchSource = { kind: 'slot', userPatchNumber: bankMsb * 128 + programChange };
    await this.readPatch();
  }

  /**
   * Replaces the temporary working copy with what USER memory has stored for a slot.
   *
   * Re-selecting the same PC often does nothing on a real GR-55 (temp edits stay).
   * Sync must copy USER → temporary explicitly, then read the sounding buffer back.
   */
  async loadUserSlotIntoWorkingCopy(userPatchNumber: number): Promise<void> {
    if (userPatchNumber < 0 || userPatchNumber >= USER_PATCH_COUNT) {
      throw new Error(`USER slot out of range: ${userPatchNumber}`);
    }
    const patch = await this.readUserPatch(userPatchNumber);
    const size = BULK_DATA_TRANSFER_SIZE_PER_MESSAGE;
    for (const block of PATCH_BLOCKS) {
      for (let done = 0; done < block.length; done += size) {
        const start = block.offset + done;
        const end = Math.min(start + size, block.offset + block.length);
        await this.session.writeData(
          TEMPORARY_PATCH_ADDRESS + start,
          patch.slice(start, end),
        );
      }
    }
    const msb = Math.floor(userPatchNumber / 128);
    const programChange = userPatchNumber % 128;
    await this.session.writeData(GR55_MAP.setup.patchBsMsb.address, [msb]);
    await this.session.writeData(GR55_MAP.setup.patchPc.address, [programChange]);
    this.patchSource = { kind: 'slot', userPatchNumber };
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

  /**
   * Puts a slot image back into one user slot. This is the only write that does not
   * start from the temporary patch, so the caller owns its confirmation.
   */
  async restoreUserPatch(userPatchNumber: number, patch: Uint8Array): Promise<void> {
    const base = userPatchAddress(userPatchNumber);
    const size = BULK_DATA_TRANSFER_SIZE_PER_MESSAGE;
    for (const block of PATCH_BLOCKS) {
      for (let done = 0; done < block.length; done += size) {
        const start = block.offset + done;
        const end = Math.min(start + size, block.offset + block.length);
        await this.session.writeData(base + start, patch.slice(start, end));
      }
    }
  }

  async readUserPatchName(userPatchNumber: number): Promise<string> {
    const bytes = await this.session.requestData(
      userPatchAddress(userPatchNumber) + PATCH_NAME_OFFSET,
      PATCH_NAME.definition.size,
    );
    return decodeName(bytes, 0);
  }

  /** Reads a user slot in full, as patch-span-indexed bytes. */
  async readUserPatch(userPatchNumber: number): Promise<Uint8Array> {
    const bytes = new Uint8Array(PATCH_SPAN);
    const base = userPatchAddress(userPatchNumber);
    await Promise.all(
      PATCH_BLOCKS.map(async (block) => {
        bytes.set(await this.session.requestData(base + block.offset, block.length), block.offset);
      }),
    );
    return bytes;
  }

  /**
   * Reads only the first block of a user slot — the one that holds its name and common
   * settings. Sync uses it to tell cheaply whether a slot it already has still matches.
   */
  async readUserPatchProbe(userPatchNumber: number): Promise<Uint8Array> {
    const block = PATCH_BLOCKS[0];
    return this.session.requestData(userPatchAddress(userPatchNumber) + block.offset, block.length);
  }

  /** The name stored in a slot image read with readUserPatch. */
  nameOfPatch(patch: Uint8Array): string {
    return decodeName(patch, PATCH_NAME_OFFSET);
  }

  /** How many parameters differ between two slot images. */
  countDifferences(a: Uint8Array, b: Uint8Array): number {
    return this.changeIndex.filter((field) => !spanMatches(a, b, field.offset, field.size)).length;
  }

  /** The parameters that differ between the working copy and a user slot. */
  async diffUserSlot(userPatchNumber: number): Promise<SlotDiffEntry[]> {
    const slot = await this.readUserPatch(userPatchNumber);
    const entries: SlotDiffEntry[] = [];
    for (const field of this.changeIndex) {
      const end = field.offset + field.size;
      const current = this.image.slice(field.offset, end);
      const stored = slot.slice(field.offset, end);
      if (sameBytes(current, stored)) {
        continue;
      }
      entries.push({
        description: field.reference.definition.description,
        current: formatFieldBytes(field.reference, current),
        slot: formatFieldBytes(field.reference, stored),
      });
    }
    return entries;
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
    this.patchSource = { kind: 'file' };
    await this.readPatch();
  }

  private applyRemoteData(address: number, bytes: Uint8Array): void {
    if (!isPedalAuthority()) {
      return;
    }
    const offset = address - TEMPORARY_PATCH_ADDRESS;
    if (offset < 0 || offset + bytes.length > PATCH_SPAN) {
      return;
    }
    this.image.set(bytes, offset);
    this.baseline.set(bytes, offset);
    this.reconcile(offset, bytes.length);
    this.bumpEpoch();
  }

  private scheduleReload(): void {
    if (!isPedalAuthority()) {
      return;
    }
    clearTimeout(this.reloadTimer);
    this.reloadTimer = setTimeout(() => {
      // Re-read the sounding patch, then ask the setup page which slot it is.
      this.readPatch()
        .then(() => this.readPatchLocation())
        .catch(this.onBackgroundError);
    }, this.patchChangeSettleMs);
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
