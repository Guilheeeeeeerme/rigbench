/**
 * Technical articulation profiles A–H (research brief).
 * These set PCM Chromatic / legato / portamento — not user pitch shift.
 */

export type ArticulationProfileId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';

export interface ArticulationProfile {
  id: ArticulationProfileId;
  labelEn: string;
  labelPt: string;
  /** Recommended PCM Chromatic when user has not overridden pitch correction. */
  chromatic: boolean;
  legato: boolean;
  portamento: boolean;
  /** Modeling guitar — PCM articulation fields not applied to modeling path. */
  modelingNative?: boolean;
}

export const ARTICULATION_PROFILES: Record<ArticulationProfileId, ArticulationProfile> = {
  A: {
    id: 'A',
    labelEn: 'Plucked strings',
    labelPt: 'Cordas dedilhadas',
    chromatic: true,
    legato: false,
    portamento: false,
  },
  B: {
    id: 'B',
    labelEn: 'Keys / piano',
    labelPt: 'Teclas / piano',
    chromatic: true,
    legato: false,
    portamento: false,
  },
  C: {
    id: 'C',
    labelEn: 'Accordion',
    labelPt: 'Sanfona / acordeón',
    chromatic: true,
    legato: false,
    portamento: false,
  },
  D: {
    id: 'D',
    labelEn: 'Melodic winds',
    labelPt: 'Sopros melódicos',
    chromatic: true,
    legato: true,
    portamento: false,
  },
  E: {
    id: 'E',
    labelEn: 'Bowed strings',
    labelPt: 'Cordas friccionadas',
    chromatic: false,
    legato: false,
    portamento: false,
  },
  F: {
    id: 'F',
    labelEn: 'Modeled guitar',
    labelPt: 'Guitarra modelada',
    chromatic: false,
    legato: false,
    portamento: false,
    modelingNative: true,
  },
  G: {
    id: 'G',
    labelEn: 'Synth lead',
    labelPt: 'Synth lead',
    chromatic: false,
    legato: false,
    portamento: false,
  },
  H: {
    id: 'H',
    labelEn: 'Pad / strings',
    labelPt: 'Pad / strings',
    chromatic: true,
    legato: false,
    portamento: false,
  },
};

export function articulationProfileOf(id: ArticulationProfileId): ArticulationProfile {
  return ARTICULATION_PROFILES[id];
}
