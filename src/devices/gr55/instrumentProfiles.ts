import type { GkSetFields } from './systemMap';
import { SCALE_BASE_MM } from './systemMap';

export type InstrumentProfileId =
  | 'caimbe-nylon'
  | 'godin-multiac-nylon'
  | 'godin-multiac-steel'
  | 'godin-lgxt'
  | 'gk3-guitar'
  | 'gk2a-guitar'
  | 'steel-divided'
  | 'nylon-divided'
  | 'bass-gk3b'
  | 'bass-gk2b'
  | 'generic-13pin';

export type OutputDestinationId = 'phones' | 'pa' | 'powered-cab' | 'guitar-amp';

/** Community-reported GK velocity starting points (not Roland official). */
export type CalibrationSubProfileId = 'natural' | 'equilibrado' | 'anti-ghost';

export interface CalibrationSubProfile {
  id: CalibrationSubProfileId;
  labelEn: string;
  labelPt: string;
  velocityDynamics: number;
  playFeel: number;
  lowVelocityCut: number;
  notesEn: string;
  notesPt: string;
}

export interface InstrumentProfile {
  id: InstrumentProfileId;
  labelEn: string;
  labelPt: string;
  /** Requires GUITAR↔BASS = BASS (+ power cycle). */
  bassMode: boolean;
  /** Documented PU TYPE label written to the active GK set. */
  puType: string;
  scaleMm: number;
  sensSeed: number;
  piezoToneLow?: number;
  piezoToneHigh?: number;
  nuanceDynamics?: number;
  downTune?: number;
  /** Suggested 8-char GK set name; only written when applying this profile. */
  gkSetName?: string;
  /** Optional velocity sub-profiles (e.g. Caimbé Anti-Ghost). */
  calibrations?: readonly CalibrationSubProfile[];
  defaultCalibrationId?: CalibrationSubProfileId;
  notesEn: string;
  notesPt: string;
  /** Confirm piezo generation with the musician when not certain. */
  confirmPiezoBrand?: boolean;
}

export interface OutputDestination {
  id: OutputDestinationId;
  labelEn: string;
  labelPt: string;
  outputSelect: string;
  scope: 'system';
}

/** Caimbé nylon community starting points (Cifra Club / Pamplona Jr. report for Anti-Ghost). */
export const CAIMBE_CALIBRATIONS: readonly CalibrationSubProfile[] = [
  {
    id: 'natural',
    labelEn: 'Natural',
    labelPt: 'Natural',
    velocityDynamics: 4,
    playFeel: 3,
    lowVelocityCut: 3,
    notesEn: 'Community starting point — lighter cut, more dynamic response.',
    notesPt: 'Ponto de partida da comunidade — corte leve, mais dinâmica.',
  },
  {
    id: 'equilibrado',
    labelEn: 'Balanced',
    labelPt: 'Equilibrado',
    velocityDynamics: 5,
    playFeel: 3,
    lowVelocityCut: 5,
    notesEn: 'Community starting point — middle ground for mixed playing.',
    notesPt: 'Ponto de partida da comunidade — meio-termo para toque misto.',
  },
  {
    id: 'anti-ghost',
    labelEn: 'Anti-Ghost',
    labelPt: 'Anti-Ghost',
    velocityDynamics: 5,
    playFeel: 4,
    lowVelocityCut: 8,
    notesEn:
      'Community-reported (Cifra Club / Pamplona Jr.) — not Roland official. Starting point only; fine-tune on the pedal meter.',
    notesPt:
      'Relato da comunidade (Cifra Club / Pamplona Jr.) — não é oficial Roland. Só ponto de partida; ajuste fino no medidor da pedaleira.',
  },
];

export const INSTRUMENT_PROFILES: readonly InstrumentProfile[] = [
  {
    id: 'caimbe-nylon',
    labelEn: 'Caimbé Nylon',
    labelPt: 'Caimbé Nylon',
    bassMode: false,
    // Leave confirmable — do not assume PIEZO R until the musician confirms brand.
    puType: 'PIEZO',
    scaleMm: 650,
    sensSeed: 28,
    piezoToneLow: 0,
    piezoToneHigh: 0,
    nuanceDynamics: 0,
    downTune: 0,
    gkSetName: 'CAIMBE',
    calibrations: CAIMBE_CALIBRATIONS,
    defaultCalibrationId: 'anti-ghost',
    confirmPiezoBrand: true,
    notesEn:
      'GK assistant only (not a patch). Community-reported starting points for nylon Caimbé — not guaranteed. Per-string SENS ~25–30; adjust on the pedal meter (app cannot read live levels). Confirm PU TYPE (PIEZO / F / G / L / R) for your saddles.',
    notesPt:
      'Assistente de GK apenas (não é patch). Pontos de partida relatados pela comunidade para Caimbé nylon — sem garantia. SENS por corda ~25–30; ajuste no medidor da pedaleira (o app não lê níveis ao vivo). Confirme PU TYPE (PIEZO / F / G / L / R) dos captadores.',
  },
  {
    id: 'godin-multiac-nylon',
    labelEn: 'Godin Multiac Nylon SA / ACS-SA',
    labelPt: 'Godin Multiac Nylon SA / ACS-SA',
    bassMode: false,
    puType: 'PIEZO R',
    scaleMm: 648,
    sensSeed: 42,
    piezoToneLow: 0,
    piezoToneHigh: 0,
    notesEn: 'RMC-class piezo on 13-pin. Distance is ignored for piezo types.',
    notesPt: 'Piezo classe RMC em 13 pinos. Distância é ignorada em tipos piezo.',
  },
  {
    id: 'godin-multiac-steel',
    labelEn: 'Godin Multiac Steel SA',
    labelPt: 'Godin Multiac Steel SA',
    bassMode: false,
    puType: 'PIEZO R',
    scaleMm: 648,
    sensSeed: 45,
    confirmPiezoBrand: true,
    notesEn: 'Confirm piezo generation (RMC / L.R. Baggs / other) if tracking is off.',
    notesPt: 'Confirme a geração do piezo (RMC / L.R. Baggs / outro) se o tracking falhar.',
  },
  {
    id: 'godin-lgxt',
    labelEn: 'Godin LGXT / XTSA',
    labelPt: 'Godin LGXT / XTSA',
    bassMode: false,
    puType: 'PIEZO R',
    scaleMm: 648,
    sensSeed: 48,
    confirmPiezoBrand: true,
    notesEn: 'Electric + piezo; confirm saddle brand if needed.',
    notesPt: 'Elétrica + piezo; confirme a marca do captador se precisar.',
  },
  {
    id: 'gk3-guitar',
    labelEn: 'Guitar with Roland GK-3',
    labelPt: 'Guitarra com Roland GK-3',
    bassMode: false,
    puType: 'GK-3',
    scaleMm: 648,
    sensSeed: 65,
    notesEn: 'Set scale and PU↔bridge distance for your guitar.',
    notesPt: 'Ajuste escala e distância PU↔ponte para a sua guitarra.',
  },
  {
    id: 'gk2a-guitar',
    labelEn: 'Guitar with Roland GK-2A',
    labelPt: 'Guitarra com Roland GK-2A',
    bassMode: false,
    puType: 'GK-2A',
    scaleMm: 648,
    sensSeed: 65,
    notesEn: 'Legacy hex pickup.',
    notesPt: 'Captador hex legado.',
  },
  {
    id: 'steel-divided',
    labelEn: 'Steel-string with divided pickup',
    labelPt: 'Violão de aço com captador dividido',
    bassMode: false,
    puType: 'PIEZO',
    scaleMm: 648,
    sensSeed: 40,
    confirmPiezoBrand: true,
    notesEn: 'Choose Fishman / Graph Tech / L.R. Baggs / RMC / flat piezo when known.',
    notesPt: 'Escolha Fishman / Graph Tech / L.R. Baggs / RMC / piezo plano quando souber.',
  },
  {
    id: 'nylon-divided',
    labelEn: 'Nylon-string with divided pickup',
    labelPt: 'Violão de nylon com captador dividido',
    bassMode: false,
    puType: 'PIEZO R',
    scaleMm: 650,
    sensSeed: 42,
    confirmPiezoBrand: true,
    notesEn: 'Often RMC-class; confirm manufacturer.',
    notesPt: 'Frequente classe RMC; confirme o fabricante.',
  },
  {
    id: 'bass-gk3b',
    labelEn: 'Bass with Roland GK-3B',
    labelPt: 'Baixo com Roland GK-3B',
    bassMode: true,
    puType: 'GK-3B',
    scaleMm: 864,
    sensSeed: 60,
    notesEn: 'Requires Guitar/Bass = BASS and a power cycle. Separate patch world.',
    notesPt: 'Exige Guitar/Bass = BASS e religar a pedaleira. Mundo de patches separado.',
  },
  {
    id: 'bass-gk2b',
    labelEn: 'Bass with Roland GK-2B',
    labelPt: 'Baixo com Roland GK-2B',
    bassMode: true,
    puType: 'GK-2B',
    scaleMm: 864,
    sensSeed: 60,
    notesEn: 'Requires Guitar/Bass = BASS and a power cycle.',
    notesPt: 'Exige Guitar/Bass = BASS e religar a pedaleira.',
  },
  {
    id: 'generic-13pin',
    labelEn: 'Other 13-pin compatible instrument',
    labelPt: 'Outro instrumento compatível 13 pinos',
    bassMode: false,
    puType: 'PIEZO',
    scaleMm: 648,
    sensSeed: 50,
    confirmPiezoBrand: true,
    notesEn: '13-pin GK only — not XLR, MIDI DIN, or a lone 1/4" jack.',
    notesPt: 'Somente GK 13 pinos — não XLR, MIDI DIN nem P10 isolado.',
  },
];

export const OUTPUT_DESTINATIONS: readonly OutputDestination[] = [
  {
    id: 'phones',
    labelEn: 'Headphones / line / PA interface',
    labelPt: 'Fones / linha / interface de PA',
    outputSelect: 'LINE/PHONES',
    scope: 'system',
  },
  {
    id: 'pa',
    labelEn: 'Mixer / PA return',
    labelPt: 'Mesa / retorno de PA',
    outputSelect: 'LINE/PHONES',
    scope: 'system',
  },
  {
    id: 'powered-cab',
    labelEn: 'Powered speaker / FRFR',
    labelPt: 'Caixa amplificada / FRFR',
    outputSelect: 'STACK',
    scope: 'system',
  },
  {
    id: 'guitar-amp',
    labelEn: 'Guitar amplifier',
    labelPt: 'Amplificador de guitarra',
    outputSelect: 'JC-120',
    scope: 'system',
  },
];

export const PIEZO_BRAND_OPTIONS = [
  { id: 'PIEZO', labelEn: 'Flat-response piezo', labelPt: 'Piezo resposta plana' },
  { id: 'PIEZO F', labelEn: 'Fishman', labelPt: 'Fishman' },
  { id: 'PIEZO G', labelEn: 'Graph Tech', labelPt: 'Graph Tech' },
  { id: 'PIEZO L', labelEn: 'L.R. Baggs', labelPt: 'L.R. Baggs' },
  { id: 'PIEZO R', labelEn: 'RMC (Godin class)', labelPt: 'RMC (classe Godin)' },
] as const;

export function profileOf(id: InstrumentProfileId): InstrumentProfile | undefined {
  return INSTRUMENT_PROFILES.find((profile) => profile.id === id);
}

export function calibrationOf(
  profile: InstrumentProfile,
  id?: CalibrationSubProfileId,
): CalibrationSubProfile | undefined {
  const list = profile.calibrations;
  if (!list?.length) return undefined;
  const want = id ?? profile.defaultCalibrationId;
  return list.find((item) => item.id === want) ?? list[0];
}

/** Deterministic GK-set field writes for a profile (SYSTEM scope). */
export function gkWritesForProfile(
  profile: InstrumentProfile,
  puTypeOverride?: string,
  calibrationId?: CalibrationSubProfileId,
): { field: keyof GkSetFields; value: string | number }[] {
  const puType = puTypeOverride ?? profile.puType;
  const sens = profile.sensSeed;
  const cal = calibrationOf(profile, calibrationId);
  const playFeel = cal?.playFeel ?? 3;
  const lowVelocityCut =
    cal?.lowVelocityCut ?? (puType.startsWith('PIEZO') ? 4 : 2);
  const velocityDynamics = cal?.velocityDynamics ?? 5;
  const nuanceDynamics = profile.nuanceDynamics ?? 5;
  const writes: { field: keyof GkSetFields; value: string | number }[] = [
    { field: 'puType', value: puType },
    { field: 'scale', value: profile.scaleMm - SCALE_BASE_MM },
    { field: 'puPhase', value: 'NORMAL' },
    { field: 'puDirection', value: 'NORMAL' },
    { field: 's1s2Position', value: 'NORMAL' },
    { field: 'normalPuGain', value: 0 },
    { field: 'string1Sens', value: sens },
    { field: 'string2Sens', value: sens },
    { field: 'string3Sens', value: sens },
    { field: 'string4Sens', value: sens },
    { field: 'string5Sens', value: sens },
    { field: 'string6Sens', value: sens },
    { field: 'playFeel', value: playFeel },
    { field: 'lowVelocityCut', value: lowVelocityCut },
    { field: 'velocityDynamics', value: velocityDynamics },
    { field: 'nuanceDynamics', value: nuanceDynamics },
    { field: 'nuanceTrim', value: 5 },
  ];
  if (profile.piezoToneLow != null) {
    writes.push({ field: 'piezoToneLow', value: profile.piezoToneLow });
  }
  if (profile.piezoToneHigh != null) {
    writes.push({ field: 'piezoToneHigh', value: profile.piezoToneHigh });
  }
  if (profile.downTune != null) {
    writes.push({ field: 'downTune', value: profile.downTune });
  }
  return writes;
}
