import type { BooleanField, FieldReference, FieldType } from '../../protocol/RolandAddressMap';
import { RolandGR55SysExConfig } from '../../protocol/RolandDevices';
import type { FieldValue, GkMode } from './editor';
import { TEMPORARY_PATCH, TEMPORARY_PATCH_ADDRESS } from './patchLayout';

const common = TEMPORARY_PATCH.common;

/** Reads one field of a patch, wherever its bytes are: the working copy or a cached slot. */
export type PatchReader = <T>(field: FieldReference<FieldType<T>>) => FieldValue<T>;

/** A reader over a slot image as sync cached it. */
export function readerOf(bytes: Uint8Array): PatchReader {
  return (field) => {
    const offset = field.address - TEMPORARY_PATCH_ADDRESS;
    const { type, size } = field.definition;
    try {
      return { ok: true, value: type.decode(bytes, offset, size) };
    } catch {
      return { ok: false, raw: bytes.slice(offset, offset + size) };
    }
  };
}

/** The pedals and switches a player has under foot and hand. */
export type PedalId = 'ctl' | 'exp' | 'expOn' | 'expSw' | 'gkVol' | 'gkS1' | 'gkS2';

export const PEDAL_IDS: readonly PedalId[] = [
  'ctl',
  'exp',
  'expOn',
  'expSw',
  'gkVol',
  'gkS1',
  'gkS2',
];

/** The patch's own function for each pedal: the second of the three layers. */
const PATCH_PEDAL_FUNCTIONS: Record<PedalId, FieldReference> = {
  ctl: common.ctl.function,
  exp: common.expPdlOff.function,
  expOn: common.expPdlOn.function,
  expSw: common.expSw.function,
  gkVol: common.gkVol.function,
  gkS1: common.gkS1.function,
  gkS2: common.gkS2.function,
};

/** Where the editor shows each pedal, for the "edit" links of the Stage. */
export const PEDAL_SECTIONS: Record<PedalId, string> = {
  ctl: 'ctl',
  exp: 'exp-off',
  expOn: 'exp-on',
  expSw: 'exp-switch',
  gkVol: 'gk-volume',
  gkS1: 'gk-s1',
  gkS2: 'gk-s2',
};

/** Whether a pedal that holds a state is on, when the patch says. */
const PEDAL_STATUS: Partial<Record<PedalId, FieldReference<BooleanField>>> = {
  ctl: common.ctl.status,
  expSw: common.expSw.status,
};

// The assign sources that are a pedal with an on/off state the patch reports.
const SOURCE_PEDAL: Record<string, PedalId> = {
  CTL: 'ctl',
  'EXP PEDAL SW': 'expSw',
};

const ASSIGNS = [
  common.assign1,
  common.assign2,
  common.assign3,
  common.assign4,
  common.assign5,
  common.assign6,
  common.assign7,
  common.assign8,
];

export interface PedalRow {
  id: PedalId;
  /** What the patch has this pedal do, in the pedal's own words. */
  function: string | undefined;
  /** On or off, for the pedals whose state the patch reports. */
  on: boolean | undefined;
}

/** One assign that is switched on: a "cut" a pedal step makes inside the patch. */
export interface Cut {
  /** 1–8. */
  number: number;
  /** Stable key for the name the musician gives this cut. */
  key: string;
  source: string;
  target: string;
  mode: string | undefined;
  /** The cut's source pedal is on right now, when that can be known. */
  active: boolean | undefined;
}

export interface StageView {
  pedals: PedalRow[];
  cuts: Cut[];
}

function isOn(read: PatchReader, field: FieldReference<BooleanField>): boolean | undefined {
  const result = read(field);
  return result.ok ? result.value !== field.definition.type.invertedForDisplay : undefined;
}

/** What each pedal does in a patch and which assigns are live, read through any reader. */
export function stageView(read: PatchReader, mode: GkMode): StageView {
  const maps = RolandGR55SysExConfig.gr55!;
  const assignsMap = mode === 'BASS' ? maps.assignsMapBassMode : maps.assignsMapGuitarMode;

  const pedals = PEDAL_IDS.map((id): PedalRow => {
    const value = read(PATCH_PEDAL_FUNCTIONS[id] as FieldReference<FieldType<string>>);
    const status = PEDAL_STATUS[id];
    return {
      id,
      function: value.ok ? String(value.value) : undefined,
      on: status ? isOn(read, status) : undefined,
    };
  });

  const cuts: Cut[] = [];
  ASSIGNS.forEach((assign, index) => {
    if (isOn(read, assign.switch) !== true) {
      return;
    }
    const source = read(assign.source as FieldReference<FieldType<string>>);
    const target = read(assign.target);
    const sourceMode = read(assign.sourceMode as FieldReference<FieldType<string>>);
    let targetName: string | undefined;
    if (target.ok) {
      try {
        targetName = assignsMap.getByIndex(target.value).description;
      } catch {
        // A target number the map has no entry for.
      }
    }
    const sourceName = source.ok ? String(source.value) : '?';
    const pedal = SOURCE_PEDAL[sourceName];
    cuts.push({
      number: index + 1,
      key: `assign-${index + 1}`,
      source: sourceName,
      target: targetName ?? '?',
      mode: sourceMode.ok ? String(sourceMode.value) : undefined,
      active: pedal ? pedals.find((row) => row.id === pedal)?.on : undefined,
    });
  });

  return { pedals, cuts };
}
