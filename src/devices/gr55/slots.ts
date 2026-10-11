import { RolandGR55SysExConfig } from '../../protocol/RolandDevices';
import type { GkMode } from './editor';

export interface Slot {
  label: string;
  userPatchNumber: number;
  bankMsb: number;
  programChange: number;
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
