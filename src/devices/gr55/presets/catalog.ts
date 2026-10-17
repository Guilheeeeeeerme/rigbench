import type { InstrumentProfileId } from '../instrumentProfiles';
import type { ArchitectureId } from './architectures';
import { composeAll } from './compose';
import { CATALOG_SLOTS } from './catalogSlots';
import type { ArticulationProfileId } from './profiles';
import type { RoleId } from './taxonomy';
import { RHYTHMS } from './taxonomy';

export type ValidationStatus =
  | 'documented'
  | 'implemented'
  | 'hardware-tested'
  | 'approximation';

export type ParamScope = 'system' | 'gk-set' | 'patch';

export type LineRoute = 'BYPS' | 'AMP' | 'MFX';

export interface PresetCtlExp {
  ctl: string;
  exp: string;
  expSw: string;
}

/**
 * Full FX / routing architecture for a preset.
 * Apply always wipes the previous chain, then installs this.
 */
export interface PresetChain {
  pcm1Route: LineRoute;
  pcm2Route: LineRoute;
  modelingRoute: LineRoute;
  normalRoute: LineRoute;
  ampOn: boolean;
  ampType?: string;
  ampGain?: number;
  ampLevel?: number;
  modOn: boolean;
  modType?: string;
  mfxOn: boolean;
  chorusOn: boolean;
  delayOn: boolean;
  reverbOn: boolean;
  eqOn: boolean;
}

export interface MusicalPreset {
  id: string;
  /** Rhythm catalog id (Brazilian 40 + cumbia subgenres). */
  rhythmId: string;
  /** @deprecated Alias of rhythmId for older filters. */
  genre: string;
  /** @deprecated Alias of rhythmId. */
  subgenre: string;
  role: RoleId;
  nameEn: string;
  namePt: string;
  descriptionEn: string;
  descriptionPt: string;
  techniqueEn: string;
  techniquePt: string;
  compatibleInstruments: readonly InstrumentProfileId[];
  pcm1?: string;
  pcm2?: string;
  modelingCategory?: string;
  modelingTone?: string;
  normalPuOn?: boolean;
  pcm1On?: boolean;
  pcm2On?: boolean;
  modelingOn?: boolean;
  pcm1Level?: number;
  pcm2Level?: number;
  modelingLevel?: number;
  normalLevel?: number;
  pcm2Standby?: boolean;
  /** Recommended PCM Chromatic from articulation profile (not user pitch shift). */
  chromatic?: boolean;
  legato?: boolean;
  portamento?: boolean;
  /** Catalog pitch shift is always 0; session may override. */
  pitchShift?: number;
  patchLevel?: number;
  ampType?: string;
  ampOn?: boolean;
  modType?: string;
  modOn?: boolean;
  chain?: PresetChain;
  articulationProfile?: ArticulationProfileId;
  architectureId?: ArchitectureId;
  ctlExp: PresetCtlExp;
  gkPrerequisitesEn: string;
  gkPrerequisitesPt: string;
  scopes: readonly ParamScope[];
  docRefs: readonly string[];
  validationStatus: ValidationStatus;
  shipped: boolean;
  /** Curated priority / recommended sound within its rhythm. */
  priority?: boolean;
}

/** Full composed catalog (≥180 usable presets). */
export const PRESETS: readonly MusicalPreset[] = composeAll(CATALOG_SLOTS);

export function shippedPresets(): MusicalPreset[] {
  return PRESETS.filter((preset) => preset.shipped);
}

export function presetOf(id: string): MusicalPreset | undefined {
  return PRESETS.find((preset) => preset.id === id);
}

export function presetsMatching(filter: {
  rhythmId?: string;
  genre?: string;
  subgenre?: string;
  role?: RoleId;
  /** When set, compatible presets sort first; incompatible stay listed but flagged. */
  instrumentId?: InstrumentProfileId;
}): MusicalPreset[] {
  const rhythmId = filter.rhythmId ?? filter.genre ?? filter.subgenre;
  const instrumentId = filter.instrumentId;
  return shippedPresets()
    .filter((preset) => {
      if (rhythmId && preset.rhythmId !== rhythmId && preset.genre !== rhythmId) return false;
      if (filter.role && preset.role !== filter.role) return false;
      return true;
    })
    .sort((a, b) => {
      const pri = Number(Boolean(b.priority)) - Number(Boolean(a.priority));
      if (pri !== 0) return pri;
      if (!instrumentId) return 0;
      const aOk = a.compatibleInstruments.includes(instrumentId) ? 1 : 0;
      const bOk = b.compatibleInstruments.includes(instrumentId) ? 1 : 0;
      return bOk - aOk;
    });
}

/** True when the preset lists the instrument (or has no restriction). */
export function presetFitsInstrument(
  preset: MusicalPreset,
  instrumentId: InstrumentProfileId,
): boolean {
  return preset.compatibleInstruments.includes(instrumentId);
}

export function rhythmsWithPresets(): typeof RHYTHMS {
  const ids = new Set(shippedPresets().map((preset) => preset.rhythmId));
  return RHYTHMS.filter((rhythm) => ids.has(rhythm.id));
}
