import type { InstrumentProfileId } from '../instrumentProfiles';
import type { ArchitectureId } from './architectures';
import { architectureOf } from './architectures';
import type {
  MusicalPreset,
  ParamScope,
  PresetCtlExp,
  ValidationStatus,
} from './catalog';
import type { ArticulationProfileId } from './profiles';
import { articulationProfileOf } from './profiles';
import type { RoleId } from './taxonomy';
import { voiceOf } from './toneLibrary';

export interface PresetSlotDef {
  id: string;
  rhythmId: string;
  role: RoleId;
  nameEn: string;
  namePt: string;
  descriptionEn: string;
  descriptionPt: string;
  techniqueEn: string;
  techniquePt: string;
  architecture: ArchitectureId;
  profile: ArticulationProfileId;
  pcm1?: string;
  pcm2?: string;
  modeling?: string;
  levelOverrides?: Partial<{
    pcm1Level: number;
    pcm2Level: number;
    modelingLevel: number;
    pcm2Standby: boolean;
  }>;
  ctlExp?: Partial<PresetCtlExp>;
  compatibleInstruments?: readonly InstrumentProfileId[];
  forceApproximation?: boolean;
  /** Curated priority / recommended sound within its rhythm. */
  priority?: boolean;
}

const DEFAULT_INSTRUMENTS: readonly InstrumentProfileId[] = [
  'caimbe-nylon',
  'godin-multiac-nylon',
  'godin-multiac-steel',
  'gk3-guitar',
  'generic-13pin',
];

/**
 * Compose a fully configured MusicalPreset from shared architecture + voices.
 */
export function composePreset(slot: PresetSlotDef): MusicalPreset {
  const arch = architectureOf(slot.architecture);
  const profile = articulationProfileOf(slot.profile);
  const levels = { ...arch.defaultLevels, ...slot.levelOverrides };

  const pcm1 = slot.pcm1 ? voiceOf(slot.pcm1) : undefined;
  const pcm2 = slot.pcm2 ? voiceOf(slot.pcm2) : undefined;
  const modeling = slot.modeling ? voiceOf(slot.modeling) : undefined;

  if (pcm1 && pcm1.kind !== 'pcm') throw new Error(`${slot.id}: pcm1 must be pcm voice`);
  if (pcm2 && pcm2.kind !== 'pcm') throw new Error(`${slot.id}: pcm2 must be pcm voice`);
  if (modeling && modeling.kind !== 'modeling') {
    throw new Error(`${slot.id}: modeling must be modeling voice`);
  }

  const pcm2Standby = Boolean(levels.pcm2Standby) && Boolean(pcm2);
  const pcm1Level = pcm1 ? (levels.pcm1Level ?? 85) : 0;
  // Standby keeps tone + level installed but muted until CTL; preserve curated level.
  const pcm2Level = pcm2 ? (levels.pcm2Level ?? 45) : 0;
  const modelingLevel = modeling ? (levels.modelingLevel ?? 100) : 0;
  const normalLevel = levels.normalOn ? (levels.normalLevel ?? 0) : 0;

  const pcm1On = Boolean(pcm1) && pcm1Level > 0;
  const pcm2On = Boolean(pcm2) && (pcm2Standby || pcm2Level > 0);
  const modelingOn = Boolean(modeling) && modelingLevel > 0;
  const normalOn = normalLevel > 0;

  if (!pcm1On && !pcm2On && !modelingOn && !normalOn) {
    throw new Error(`${slot.id}: preset has no sounding source`);
  }

  const approximation =
    slot.forceApproximation === true ||
    Boolean(pcm1?.approximation) ||
    Boolean(pcm2?.approximation) ||
    Boolean(modeling?.approximation);

  const validationStatus: ValidationStatus = approximation ? 'approximation' : 'implemented';

  const ctlExp: PresetCtlExp = {
    ...arch.defaultCtlExp,
    ...slot.ctlExp,
  };

  const scopes: ParamScope[] = ['patch'];

  return {
    id: slot.id,
    rhythmId: slot.rhythmId,
    genre: slot.rhythmId,
    subgenre: slot.rhythmId,
    role: slot.role,
    nameEn: slot.nameEn,
    namePt: slot.namePt,
    descriptionEn: slot.descriptionEn,
    descriptionPt: slot.descriptionPt,
    techniqueEn: slot.techniqueEn,
    techniquePt: slot.techniquePt,
    compatibleInstruments: slot.compatibleInstruments ?? DEFAULT_INSTRUMENTS,
    pcm1: pcm1?.pcm,
    pcm2: pcm2?.pcm,
    modelingCategory: modeling?.modelingCategory,
    modelingTone: modeling?.modelingTone,
    pcm1On,
    pcm2On,
    modelingOn,
    normalPuOn: normalOn,
    pcm1Level,
    pcm2Level,
    modelingLevel,
    normalLevel,
    pcm2Standby,
    chromatic: profile.modelingNative ? false : profile.chromatic,
    legato: profile.modelingNative ? false : profile.legato && profile.chromatic,
    portamento: profile.portamento,
    pitchShift: 0,
    patchLevel: arch.patchLevel,
    chain: arch.chain,
    articulationProfile: slot.profile,
    architectureId: slot.architecture,
    ctlExp,
    gkPrerequisitesEn: 'Stable GK set; calibrate SENS on the pedal display.',
    gkPrerequisitesPt: 'GK set estável; calibre SENS no display da pedaleira.',
    scopes,
    docRefs: [
      'GR-55_OM.pdf',
      'RolandGR55ToneMap.ts',
      'docs/current/brazilian-rhythm-catalog.md',
    ],
    validationStatus,
    shipped: true,
    priority: slot.priority === true,
  };
}

export function composeAll(slots: readonly PresetSlotDef[]): MusicalPreset[] {
  return slots.map(composePreset);
}
