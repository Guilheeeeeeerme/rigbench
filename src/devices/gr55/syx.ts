import { RolandGR55SysExConfig } from '../../protocol/RolandDevices';
import {
  BULK_DATA_TRANSFER_SIZE_PER_MESSAGE,
  isValidChecksum,
  makeDataSetMessage,
  parseDataResponseMessage,
} from '../../protocol/RolandSysExProtocol';
import {
  PATCH_BLOCKS,
  PATCH_SPAN,
  TEMPORARY_PATCH_ADDRESS,
  USER_PATCH_AREA_ADDRESS,
  USER_PATCH_COUNT,
  USER_PATCH_STRIDE,
  userPatchAddress,
} from './patchLayout';

// The device ID Roland ships the GR-55 with; a .syx file is not tied to one pedal.
const FILE_DEVICE_ID = 0x10;

export type SyxProblem = 'no-patch-data' | 'bad-checksum' | 'out-of-range';

export class SyxError extends Error {
  constructor(readonly problem: SyxProblem) {
    super(problem);
    this.name = 'SyxError';
  }
}

export interface PatchWrite {
  /** Offset from the start of the patch, in packed address space. */
  offset: number;
  bytes: Uint8Array;
}

/** A patch image as a .syx file: one DT1 per block, addressed to the temporary patch. */
export function encodePatchSyx(image: Uint8Array): Uint8Array {
  const out: number[] = [];
  const size = BULK_DATA_TRANSFER_SIZE_PER_MESSAGE;
  for (const block of PATCH_BLOCKS) {
    for (let done = 0; done < block.length; done += size) {
      const start = block.offset + done;
      const end = Math.min(start + size, block.offset + block.length);
      out.push(
        ...makeDataSetMessage(
          RolandGR55SysExConfig,
          FILE_DEVICE_ID,
          TEMPORARY_PATCH_ADDRESS + start,
          image.subarray(start, end),
        ),
      );
    }
  }
  return Uint8Array.from(out);
}

function splitMessages(file: Uint8Array): Uint8Array[] {
  const messages: Uint8Array[] = [];
  let start = -1;
  for (let i = 0; i < file.length; i++) {
    if (file[i] === 0xf0) {
      start = i;
    } else if (file[i] === 0xf7 && start >= 0) {
      messages.push(file.subarray(start, i + 1));
      start = -1;
    }
  }
  return messages;
}

function patchOffset(address: number): number | undefined {
  if (address >= TEMPORARY_PATCH_ADDRESS && address < TEMPORARY_PATCH_ADDRESS + PATCH_SPAN) {
    return address - TEMPORARY_PATCH_ADDRESS;
  }
  // A dump taken from a user slot carries that slot's addresses; rebase it onto the patch.
  const userAreaEnd = USER_PATCH_AREA_ADDRESS + USER_PATCH_COUNT * USER_PATCH_STRIDE;
  if (address >= USER_PATCH_AREA_ADDRESS && address < userAreaEnd) {
    return (address - USER_PATCH_AREA_ADDRESS) % USER_PATCH_STRIDE;
  }
  return undefined;
}

/**
 * Reads the GR-55 patch data out of a .syx file. Messages for other devices or other
 * areas of the GR-55 are skipped; a file with no patch data at all is an error.
 */
export function decodePatchSyx(file: Uint8Array): PatchWrite[] {
  const writes: PatchWrite[] = [];
  for (const message of splitMessages(file)) {
    const parsed = parseDataResponseMessage(RolandGR55SysExConfig, message);
    if (!parsed) {
      continue;
    }
    const offset = patchOffset(parsed.address);
    if (offset == null) {
      continue;
    }
    if (!isValidChecksum(parsed)) {
      throw new SyxError('bad-checksum');
    }
    if (offset + parsed.valueBytes.length > PATCH_SPAN) {
      throw new SyxError('out-of-range');
    }
    writes.push({ offset, bytes: Uint8Array.from(parsed.valueBytes) });
  }
  if (writes.length === 0) {
    throw new SyxError('no-patch-data');
  }
  return writes;
}

/** One user slot image from a backup file. */
export interface SlotImage {
  userPatchNumber: number;
  bytes: Uint8Array;
}

function slotNumber(address: number): number | undefined {
  const end = USER_PATCH_AREA_ADDRESS + USER_PATCH_COUNT * USER_PATCH_STRIDE;
  if (address < USER_PATCH_AREA_ADDRESS || address >= end) {
    return undefined;
  }
  return Math.floor((address - USER_PATCH_AREA_ADDRESS) / USER_PATCH_STRIDE);
}

/** Every user slot in the pedal, as one .syx file of slot-addressed DT1 messages. */
export function encodeSlotBackupSyx(slots: readonly SlotImage[]): Uint8Array {
  const out: number[] = [];
  const size = BULK_DATA_TRANSFER_SIZE_PER_MESSAGE;
  for (const slot of slots) {
    const base = userPatchAddress(slot.userPatchNumber);
    for (const block of PATCH_BLOCKS) {
      for (let done = 0; done < block.length; done += size) {
        const start = block.offset + done;
        const end = Math.min(start + size, block.offset + block.length);
        out.push(
          ...makeDataSetMessage(
            RolandGR55SysExConfig,
            FILE_DEVICE_ID,
            base + start,
            slot.bytes.subarray(start, end),
          ),
        );
      }
    }
  }
  return Uint8Array.from(out);
}

/**
 * Reads a slot backup file back into slot images. Messages for other areas are
 * skipped; a file with no slot data at all is an error.
 */
export function decodeSlotBackupSyx(file: Uint8Array): SlotImage[] {
  const slots = new Map<number, Uint8Array>();
  for (const message of splitMessages(file)) {
    const parsed = parseDataResponseMessage(RolandGR55SysExConfig, message);
    if (!parsed) {
      continue;
    }
    const number = slotNumber(parsed.address);
    if (number == null) {
      continue;
    }
    if (!isValidChecksum(parsed)) {
      throw new SyxError('bad-checksum');
    }
    const offset = parsed.address - userPatchAddress(number);
    if (offset < 0 || offset + parsed.valueBytes.length > PATCH_SPAN) {
      throw new SyxError('out-of-range');
    }
    let bytes = slots.get(number);
    if (!bytes) {
      bytes = new Uint8Array(PATCH_SPAN);
      slots.set(number, bytes);
    }
    bytes.set(Uint8Array.from(parsed.valueBytes), offset);
  }
  if (slots.size === 0) {
    throw new SyxError('no-patch-data');
  }
  return [...slots].map(([userPatchNumber, bytes]) => ({ userPatchNumber, bytes }));
}

/** A small block of the system area, as one .syx file. */
export function encodeSystemSyx(address: number, bytes: Uint8Array): Uint8Array {
  return Uint8Array.from(makeDataSetMessage(RolandGR55SysExConfig, FILE_DEVICE_ID, address, bytes));
}

/** Reads a system block back, checking it addresses the same area. */
export function decodeSystemSyx(
  file: Uint8Array,
  expectedAddress: number,
  expectedSize: number,
): Uint8Array {
  const blocks: Uint8Array[] = [];
  for (const message of splitMessages(file)) {
    const parsed = parseDataResponseMessage(RolandGR55SysExConfig, message);
    if (!parsed || parsed.address < expectedAddress) {
      continue;
    }
    if (!isValidChecksum(parsed)) {
      throw new SyxError('bad-checksum');
    }
    const offset = parsed.address - expectedAddress;
    if (offset !== blocks.reduce((sum, block) => sum + block.length, 0)) {
      throw new SyxError('out-of-range');
    }
    blocks.push(Uint8Array.from(parsed.valueBytes));
  }
  const joined = concatenate(blocks);
  if (joined.length !== expectedSize) {
    throw new SyxError('out-of-range');
  }
  return joined;
}

function concatenate(blocks: readonly Uint8Array[]): Uint8Array {
  const total = blocks.reduce((sum, block) => sum + block.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const block of blocks) {
    out.set(block, offset);
    offset += block.length;
  }
  return out;
}
