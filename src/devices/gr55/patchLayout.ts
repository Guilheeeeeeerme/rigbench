import { StructDefinition } from '../../protocol/RolandAddressMap';
import type { AtomDefinition } from '../../protocol/RolandAddressMap';
import { RolandGR55AddressMapAbsolute } from '../../protocol/RolandGR55AddressMap';
import { pack7 } from '../../protocol/RolandSysExProtocol';

export const GR55_MAP = RolandGR55AddressMapAbsolute;
export const TEMPORARY_PATCH = GR55_MAP.temporaryPatch;
export const TEMPORARY_PATCH_ADDRESS = TEMPORARY_PATCH.address;
// Span of the patch in packed address space, holes between its blocks included.
export const PATCH_SPAN = TEMPORARY_PATCH.definition.size;

export const USER_PATCH_AREA_ADDRESS = pack7(0x20000000);
export const USER_PATCH_STRIDE = pack7(0x010000);
export const USER_PATCH_COUNT = 297;

export function userPatchAddress(userPatchNumber: number): number {
  return USER_PATCH_AREA_ADDRESS + userPatchNumber * USER_PATCH_STRIDE;
}

export interface PatchBlock {
  /** Offset from the start of the patch, in packed address space. */
  offset: number;
  length: number;
}

/**
 * The runs of consecutive addresses a definition is made of. Each run is read with one RQ1.
 * Mirrors the coalescing done by fetchAndTokenize in the protocol's address map.
 */
export function contiguousBlocks(definition: AtomDefinition, offset = 0): PatchBlock[] {
  if (definition.isContiguous) {
    return [{ offset, length: definition.size }];
  }
  if (!(definition instanceof StructDefinition)) {
    throw new Error(`Cannot lay out ${definition.description}`);
  }
  const blocks: PatchBlock[] = [];
  let run: { start: number; end: number } | undefined;
  const flush = () => {
    if (run) {
      blocks.push({ offset: offset + run.start, length: run.end - run.start });
      run = undefined;
    }
  };
  for (const member of Object.values(definition.$ as Record<string, AtomDefinition>)) {
    if (member.isContiguous && run && member.offset === run.end) {
      run.end = member.offset + member.size;
    } else {
      flush();
      if (member.isContiguous) {
        run = { start: member.offset, end: member.offset + member.size };
      } else {
        blocks.push(...contiguousBlocks(member, offset + member.offset));
      }
    }
  }
  flush();
  return blocks;
}

export const PATCH_BLOCKS: readonly PatchBlock[] = contiguousBlocks(TEMPORARY_PATCH.definition);
