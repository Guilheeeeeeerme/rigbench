import type { MidiSession } from '../../midi/session';
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
import { temporaryPatchFields, spanMatches } from './changeTracking';
import type { PatchFieldSpan } from './changeTracking';
import { sameValue } from '../../session/sameValue';
import { isPedalAuthority } from './sessionAuthority';

export type GkMode = 'GUITAR' | 'BASS';

/** Where the working copy came from. Only a slot copy can be saved straight back. */
export type PatchSource = { kind: 'slot'; userPatchNumber: number };

const PATCH_NAME = GR55_MAP.temporaryPatch.common.patchName;
const PATCH_NAME_OFFSET = PATCH_NAME.address - TEMPORARY_PATCH_ADDRESS;
const GUITAR_BASS_SELECT = GR55_MAP.system.common.guitarBassSelect;

// Writing the temporary patch to a user slot is a command, not a data write.
const WRITE_PATCH_COMMAND = pack7(0x0f000000);
const WRITE_PATCH_REPLIES = [pack7(0x0f000001), pack7(0x0f000002)];

// Real GR-55 patch changes mute and reload the temp buffer for ~1s. 150ms was
// short enough that app DT1s landed mid-reload and were overwritten.
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

export type FieldValue<T> = { ok: true; value: T } | { ok: false; raw: Uint8Array };

/**
 * The temporary patch of a connected GR-55, mirrored in memory.
 * Edits update the mirror and go out as short DT1 messages; nothing here touches the
 * user slots except writeToUserSlot.
 */
export class Gr55Editor {
  /** Patch bytes indexed by offset from the start of the temporary patch. */
  private readonly image = new Uint8Array(PATCH_SPAN);
  private readonly listeners = new Set<() => void>();
  private readonly fieldVersions = new Map<number, number>();
  private readonly changeIndex: readonly PatchFieldSpan[];
  private epoch = 0;
  private reloadTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly unsubscribe: (() => void)[];
  private readonly patchChangeSettleMs: number;

  gkMode: GkMode = 'GUITAR';
  /** Where the current working copy came from, if the app knows. */
  patchSource: PatchSource | undefined;

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
    return String(this.fieldVersions.get(address) ?? 0);
  }

  patchSnapshot = (): number => this.epoch;

  async readSystem(): Promise<void> {
    const bytes = await this.session.requestData(
      GUITAR_BASS_SELECT.address,
      GUITAR_BASS_SELECT.definition.size,
    );
    this.gkMode = GUITAR_BASS_SELECT.definition.type.decode(bytes, 0, bytes.length) as GkMode;
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
    this.bumpField(field.address);
    return this.session.writeData(field.address, bytes, { coalesce: true });
  }

  /**
   * Send one field, read it back, and only then update the mirror from the
   * bytes the device returned. A match is decoded equality, not a send ack.
   */
  async writeVerified(
    field: FieldReference<FieldType<unknown>>,
    value: unknown,
  ): Promise<{ match: boolean }> {
    const offset = field.address - TEMPORARY_PATCH_ADDRESS;
    const { type, size } = field.definition;
    const bytes = new Uint8Array(size);
    type.encode(value as never, bytes, 0, size);
    await this.session.writeData(field.address, bytes);
    const read = await this.session.requestData(field.address, size);
    let match = false;
    try {
      match = sameValue(value, type.decode(read, 0, size));
    } catch {
      match = false;
    }
    if (offset >= 0 && offset + size <= this.image.length) {
      this.image.set(read.subarray(0, size), offset);
      this.bumpField(field.address);
    }
    return { match };
  }

  /** Write bytes already stored on the pedal, then compare the readback. */
  async writeVerifiedBytes(
    field: FieldReference<FieldType<unknown>>,
    bytes: Uint8Array,
  ): Promise<{ match: boolean }> {
    const offset = field.address - TEMPORARY_PATCH_ADDRESS;
    const payload = Uint8Array.from(bytes);
    await this.session.writeData(field.address, payload);
    const read = await this.session.requestData(field.address, payload.length);
    const match = payload.length === read.length && payload.every((byte, index) => byte === read[index]);
    if (offset >= 0 && offset + payload.length <= this.image.length) {
      this.image.set(read.subarray(0, payload.length), offset);
      this.bumpField(field.address);
    }
    return { match };
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
        await this.session.writeData(TEMPORARY_PATCH_ADDRESS + start, patch.slice(start, end));
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
   * PATCH WRITE then RQ1 the USER slot and compare to the working-copy mirror.
   * Handshake replies alone do not prove slot content.
   */
  async writeToUserSlotVerified(userPatchNumber: number): Promise<{
    ok: boolean;
    differences: number;
  }> {
    await this.writeToUserSlot(userPatchNumber);
    const slot = await this.readUserPatch(userPatchNumber);
    const differences = this.countDifferences(this.image, slot);
    return { ok: differences === 0, differences };
  }

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

  /** True when the sounding patch differs from the USER slot the pedal is on. */
  async differsFromCurrentUserSlot(): Promise<boolean | null> {
    if (this.patchSource?.kind !== 'slot') return null;
    const slot = await this.readUserPatch(this.patchSource.userPatchNumber);
    return this.countDifferences(this.image, slot) > 0;
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
