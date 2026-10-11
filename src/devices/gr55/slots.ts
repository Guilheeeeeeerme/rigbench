import { RolandGR55SysExConfig } from '../../protocol/RolandDevices';
import type { GkMode } from './editor';

export interface Slot {
  label: string;
  userPatchNumber: number;
  bankMsb: number;
  programChange: number;
}

export type BrowseStyle = 'lead' | 'rhythm' | 'other' | 'user';

/** A patch location for Studio Library browse / load (user + preset banks). */
export interface BrowsePatch {
  /** e.g. `LEAD 01-1` or `USER 01-1`. */
  label: string;
  style: BrowseStyle;
  /** ROM name for presets; undefined for user slots until sync reads them. */
  name: string | undefined;
  bankMsb: number;
  programChange: number;
  userPatchNumber: number | undefined;
}

function styleOf(styleLabel: string): BrowseStyle | undefined {
  switch (styleLabel) {
    case 'LEAD':
      return 'lead';
    case 'RHYTHM':
      return 'rhythm';
    case 'OTHER':
      return 'other';
    case 'USER':
      return 'user';
    default:
      return undefined;
  }
}

/** The user slots of the pedal in one GK mode, in the order the pedal lists them. */
export function slotsOfMode(mode: GkMode): Slot[] {
  const maps = RolandGR55SysExConfig.gr55!;
  const { patchList } = mode === 'BASS' ? maps.patchMapBassMode : maps.patchMapGuitarMode;
  return patchList.flatMap((patch) =>
    patch.userPatch
      ? [
          {
            label: patch.patchNumberLabel,
            userPatchNumber: patch.userPatch.patchNumber,
            bankMsb: patch.bankMSB,
            programChange: patch.pc,
          },
        ]
      : [],
  );
}

/** All LEAD / RHYTHM / OTHER / USER locations for the active GK mode. */
export function browsePatches(mode: GkMode): BrowsePatch[] {
  const maps = RolandGR55SysExConfig.gr55!;
  const { patchList } = mode === 'BASS' ? maps.patchMapBassMode : maps.patchMapGuitarMode;
  return patchList.flatMap((patch) => {
    const style = styleOf(patch.styleLabel);
    if (!style) return [];
    return [
      {
        label: `${patch.styleLabel} ${patch.patchNumberLabel}`,
        style,
        name: patch.builtInName,
        bankMsb: patch.bankMSB,
        programChange: patch.pc,
        userPatchNumber: patch.userPatch?.patchNumber,
      },
    ];
  });
}

export function filterBrowsePatches(
  patches: readonly BrowsePatch[],
  style: BrowseStyle | undefined,
): BrowsePatch[] {
  if (!style) return patches.filter((patch) => patch.style === 'user');
  return patches.filter((patch) => patch.style === style);
}
