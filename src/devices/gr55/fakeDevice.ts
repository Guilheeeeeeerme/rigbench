import type { MidiInputLike, MidiMessageListener, MidiOutputLike } from '../../midi/session';
import { RolandGR55SysExConfig } from '../../protocol/RolandDevices';
import {
  isValidChecksum,
  makeDataSetMessage,
  pack7,
  parseDataResponseMessage,
} from '../../protocol/RolandSysExProtocol';
import { GK_SET_COUNT, SYSTEM, gkSet } from './systemMap';
import {
  GR55_MAP,
  PATCH_SPAN,
  TEMPORARY_PATCH_ADDRESS,
  USER_PATCH_COUNT,
  userPatchAddress,
} from './patchLayout';

const DEVICE_ID = 0x10;
// PATCH SETTING, the second entry of every pedal-wide function list.
const LEFT_TO_PATCH = 1;
const COMMAND_RQ1 = 0x11;
const WRITE_PATCH_COMMAND = pack7(0x0f000000);
const PATCH_NAME_OFFSET =
  GR55_MAP.temporaryPatch.common.patchName.address - TEMPORARY_PATCH_ADDRESS;
/** Dev simulated pedal — survive Vite reloads so USER WRITE can be verified. */
const FAKE_MEMORY_KEY = 'rigbench.fakeGr55.memory.v1';

export function clearFakeGr55Memory(): void {
  try {
    sessionStorage.removeItem(FAKE_MEMORY_KEY);
  } catch {
    // ignore
  }
}

function fromSevenBitBytes(bytes: Uint8Array): number {
  let value = 0;
  for (const byte of bytes) {
    value = (value << 7) | (byte & 0x7f);
  }
  return value;
}

/**
 * A stand-in for a GR-55 on the other end of the MIDI cable: both ports in one object.
 * It answers the messages the editor sends and nothing more. Used by the tests and by
 * the simulated pedal of the development build.
 */
export class FakeGr55 implements MidiInputLike, MidiOutputLike {
  /** Device memory by packed address. Bytes never written read as zero. */
  private readonly memory = new Map<number, number>();
  private readonly listeners = new Set<MidiMessageListener>();
  private readonly persist: boolean;
  /** Every message the editor sent, oldest first. */
  readonly received: number[][] = [];
  /** Largest DT1 payload in a reply; lower it to make the device split its answers. */
  replyChunkSize = 512;
  answers = true;
  /** How long the device takes to answer, in milliseconds: a real pedal is not instant. */
  replyDelayMs = 0;
  /** How many of the next data requests go unanswered, as when the pedal falls behind. */
  dropRequests = 0;
  /**
   * When true, PATCH WRITE copies temp→USER but corrupts one USER byte so
   * readback verification can fail in tests.
   */
  corruptNextWrite = false;

  constructor(options?: { persist?: boolean }) {
    this.persist = Boolean(options?.persist);
    if (this.persist && this.restoreMemory()) {
      return;
    }
    this.setName(TEMPORARY_PATCH_ADDRESS, 'Simulated Patch');
    // Audible default — real factory patches are not silent at patch level 0.
    this.poke(GR55_MAP.temporaryPatch.common.patchLevel.address, [100]);
    // As a pedal leaves the factory: every pedal is left to the patch, GK set names blank.
    const { pedals } = SYSTEM;
    for (const pedal of [
      pedals.ctlFunction,
      pedals.expOffFunction,
      pedals.expOnFunction,
      pedals.expSwFunction,
      pedals.gkVolFunction,
      pedals.gkS1Function,
      pedals.gkS2Function,
    ]) {
      this.poke(pedal.address, [LEFT_TO_PATCH]);
    }
    for (let number = 1; number <= GK_SET_COUNT; number++) {
      this.poke(gkSet(number).name.address, Array<number>(8).fill(0x20));
    }
  }

  private restoreMemory(): boolean {
    try {
      const raw = sessionStorage.getItem(FAKE_MEMORY_KEY);
      if (!raw) return false;
      const entries = JSON.parse(raw) as [number, number][];
      if (!Array.isArray(entries) || entries.length === 0) return false;
      for (const [address, byte] of entries) {
        if (typeof address === 'number' && typeof byte === 'number') {
          this.memory.set(address, byte);
        }
      }
      return this.memory.size > 0;
    } catch {
      return false;
    }
  }

  private saveMemory(): void {
    if (!this.persist) return;
    try {
      sessionStorage.setItem(FAKE_MEMORY_KEY, JSON.stringify([...this.memory.entries()]));
    } catch {
      // ignore quota / private mode
    }
  }

  addEventListener(_type: 'midimessage', listener: MidiMessageListener): void {
    this.listeners.add(listener);
  }

  removeEventListener(_type: 'midimessage', listener: MidiMessageListener): void {
    this.listeners.delete(listener);
  }

  send(data: number[] | Uint8Array): void {
    const message = Uint8Array.from(data);
    this.received.push([...message]);
    if (this.answers) {
      setTimeout(() => this.handle(message), this.replyDelayMs);
    }
  }

  peek(address: number, length: number): Uint8Array {
    return Uint8Array.from({ length }, (_, i) => this.memory.get(address + i) ?? 0);
  }

  poke(address: number, bytes: Uint8Array | readonly number[]): void {
    bytes.forEach((byte, i) => this.memory.set(address + i, byte));
  }

  /** Sends bytes to the editor as if the pedal had produced them. */
  emit(data: number[] | Uint8Array): void {
    const event = { data: Uint8Array.from(data) };
    for (const listener of [...this.listeners]) {
      listener(event);
    }
  }

  /** Names a user slot, as if it had been saved on the pedal itself. */
  nameUserPatch(userPatchNumber: number, name: string): void {
    this.setName(userPatchAddress(userPatchNumber), name);
  }

  private setName(patchAddress: number, name: string): void {
    const bytes = Array.from(name.padEnd(16).slice(0, 16), (char) => char.charCodeAt(0));
    this.poke(patchAddress + PATCH_NAME_OFFSET, bytes);
  }

  private copyPatch(from: number, to: number): void {
    this.poke(to, this.peek(from, PATCH_SPAN));
  }

  private emitData(address: number, bytes: Uint8Array): void {
    for (let offset = 0; offset < bytes.length; offset += this.replyChunkSize) {
      this.emit(
        makeDataSetMessage(
          RolandGR55SysExConfig,
          DEVICE_ID,
          address + offset,
          bytes.subarray(offset, offset + this.replyChunkSize),
        ),
      );
    }
  }

  private handle(message: Uint8Array): void {
    if (message[1] === 0x7e && message[3] === 0x06 && message[4] === 0x01) {
      // Identity Reply: Roland, family 53 02, model 00 00, software revision 00 00 00 00
      this.emit([0xf0, 0x7e, DEVICE_ID, 0x06, 0x02, 0x41, 0x53, 0x02, 0, 0, 0, 0, 0, 0, 0xf7]);
      return;
    }
    if (message[1] !== 0x41 || message[2] !== DEVICE_ID) {
      return;
    }
    if (message[6] === COMMAND_RQ1) {
      const address = fromSevenBitBytes(message.subarray(7, 11));
      const args = message.subarray(11, message.length - 2);
      if (address === WRITE_PATCH_COMMAND) {
        this.writePatchToUserSlot(args[0] * 128 + args[2]);
      } else if (this.dropRequests > 0) {
        this.dropRequests--;
      } else {
        this.emitData(address, this.peek(address, fromSevenBitBytes(args)));
      }
      return;
    }
    const parsed = parseDataResponseMessage(RolandGR55SysExConfig, message);
    if (!parsed || !isValidChecksum(parsed)) {
      return;
    }
    this.poke(parsed.address, parsed.valueBytes);
    if (parsed.address === GR55_MAP.setup.patchPc.address) {
      this.selectUserPatch();
    }
  }

  private writePatchToUserSlot(userPatchNumber: number): void {
    if (userPatchNumber < USER_PATCH_COUNT) {
      this.copyPatch(TEMPORARY_PATCH_ADDRESS, userPatchAddress(userPatchNumber));
      if (this.corruptNextWrite) {
        this.corruptNextWrite = false;
        const nameAddr = userPatchAddress(userPatchNumber) + PATCH_NAME_OFFSET;
        this.poke(nameAddr, [0x58]); // 'X' — breaks name match / field diff
      }
    }
    this.saveMemory();
    this.emitData(pack7(0x0f000001), Uint8Array.of(0));
    this.emitData(pack7(0x0f000002), Uint8Array.of(0));
  }

  /** Simulate a physical patch change (requires the editor's PC listener). */
  emitProgramChange(program: number, channel = 0): void {
    this.emit([0xc0 | (channel & 0x0f), program & 0x7f]);
  }

  private selectUserPatch(): void {
    const [msb] = this.peek(GR55_MAP.setup.patchBsMsb.address, 1);
    const [programChange] = this.peek(GR55_MAP.setup.patchPc.address, 1);
    const userPatchNumber = msb * 128 + programChange;
    if (msb > 2 || userPatchNumber >= USER_PATCH_COUNT) {
      return;
    }
    const address = userPatchAddress(userPatchNumber);
    if (this.peek(address + PATCH_NAME_OFFSET, 16).every((byte) => byte === 0)) {
      this.setName(address, `User ${userPatchNumber + 1}`);
    }
    this.copyPatch(address, TEMPORARY_PATCH_ADDRESS);
  }
}
