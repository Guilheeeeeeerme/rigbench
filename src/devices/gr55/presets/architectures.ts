import type { PresetChain, PresetCtlExp } from './catalog';

export type ArchitectureId =
  | 'dry-pcm'
  | 'pcm-layer'
  | 'pcm-duo'
  | 'amp-guitar'
  | 'clean-chorus'
  | 'brass-duo'
  | 'synth-lead'
  | 'synth-pad'
  | 'model-plus-pad'
  | 'model-plus-keys';

export interface SourceLevels {
  pcm1Level: number;
  pcm2Level: number;
  modelingLevel: number;
  normalLevel: number;
  pcm1On: boolean;
  pcm2On: boolean;
  modelingOn: boolean;
  normalOn: boolean;
  /** Present for CTL layer toggle but muted/zero until enabled. */
  pcm2Standby?: boolean;
}

export interface ArchitectureTemplate {
  id: ArchitectureId;
  labelEn: string;
  chain: PresetChain;
  defaultLevels: SourceLevels;
  defaultCtlExp: PresetCtlExp;
  patchLevel: number;
}

const DRY: PresetChain = {
  pcm1Route: 'BYPS',
  pcm2Route: 'BYPS',
  modelingRoute: 'BYPS',
  normalRoute: 'BYPS',
  ampOn: false,
  ampType: 'FULL RANGE',
  ampGain: 20,
  ampLevel: 80,
  modOn: false,
  mfxOn: false,
  chorusOn: false,
  delayOn: false,
  reverbOn: true,
  eqOn: false,
};

const AMP_CRUNCH: PresetChain = {
  ...DRY,
  modelingRoute: 'AMP',
  ampOn: true,
  ampType: 'BOSS CRUNCH',
  ampGain: 55,
  ampLevel: 85,
};

const AMP_CLEAN: PresetChain = {
  ...DRY,
  modelingRoute: 'AMP',
  ampOn: true,
  ampType: 'BOSS CLEAN',
  ampGain: 30,
  ampLevel: 85,
  modOn: true,
  modType: 'CHORUS',
};

const LIGHT_CHORUS: PresetChain = {
  ...DRY,
  chorusOn: true,
};

export const ARCHITECTURES: Record<ArchitectureId, ArchitectureTemplate> = {
  'dry-pcm': {
    id: 'dry-pcm',
    labelEn: 'Dry PCM',
    chain: DRY,
    defaultLevels: {
      pcm1Level: 85,
      pcm2Level: 0,
      modelingLevel: 0,
      normalLevel: 0,
      pcm1On: true,
      pcm2On: false,
      modelingOn: false,
      normalOn: false,
    },
    defaultCtlExp: { ctl: 'sustain', exp: 'expression', expSw: 'effect-toggle' },
    patchLevel: 110,
  },
  'pcm-layer': {
    id: 'pcm-layer',
    labelEn: 'PCM + standby layer',
    chain: DRY,
    defaultLevels: {
      pcm1Level: 80,
      pcm2Level: 0,
      modelingLevel: 0,
      normalLevel: 0,
      pcm1On: true,
      pcm2On: true,
      modelingOn: false,
      normalOn: false,
      pcm2Standby: true,
    },
    defaultCtlExp: { ctl: 'tone-switch', exp: 'expression', expSw: 'effect-toggle' },
    patchLevel: 112,
  },
  'pcm-duo': {
    id: 'pcm-duo',
    labelEn: 'Two PCM voices',
    chain: LIGHT_CHORUS,
    defaultLevels: {
      pcm1Level: 75,
      pcm2Level: 45,
      modelingLevel: 0,
      normalLevel: 0,
      pcm1On: true,
      pcm2On: true,
      modelingOn: false,
      normalOn: false,
    },
    defaultCtlExp: { ctl: 'tone-switch', exp: 'volume', expSw: 'effect-toggle' },
    patchLevel: 110,
  },
  'amp-guitar': {
    id: 'amp-guitar',
    labelEn: 'Modeled guitar + amp',
    chain: AMP_CRUNCH,
    defaultLevels: {
      pcm1Level: 0,
      pcm2Level: 0,
      modelingLevel: 100,
      normalLevel: 0,
      pcm1On: false,
      pcm2On: false,
      modelingOn: true,
      normalOn: false,
    },
    defaultCtlExp: { ctl: 'solo-boost', exp: 'volume', expSw: 'effect-toggle' },
    patchLevel: 118,
  },
  'clean-chorus': {
    id: 'clean-chorus',
    labelEn: 'Clean modeled guitar',
    chain: AMP_CLEAN,
    defaultLevels: {
      pcm1Level: 0,
      pcm2Level: 0,
      modelingLevel: 100,
      normalLevel: 0,
      pcm1On: false,
      pcm2On: false,
      modelingOn: true,
      normalOn: false,
    },
    defaultCtlExp: { ctl: 'effect-toggle', exp: 'volume', expSw: 'effect-toggle' },
    patchLevel: 112,
  },
  'brass-duo': {
    id: 'brass-duo',
    labelEn: 'Brass / winds duo',
    chain: DRY,
    defaultLevels: {
      pcm1Level: 75,
      pcm2Level: 55,
      modelingLevel: 0,
      normalLevel: 0,
      pcm1On: true,
      pcm2On: true,
      modelingOn: false,
      normalOn: false,
    },
    defaultCtlExp: { ctl: 'tone-switch', exp: 'volume', expSw: 'effect-toggle' },
    patchLevel: 115,
  },
  'synth-lead': {
    id: 'synth-lead',
    labelEn: 'Synth lead',
    chain: DRY,
    defaultLevels: {
      pcm1Level: 85,
      pcm2Level: 0,
      modelingLevel: 0,
      normalLevel: 0,
      pcm1On: true,
      pcm2On: false,
      modelingOn: false,
      normalOn: false,
    },
    defaultCtlExp: { ctl: 'sustain', exp: 'filter', expSw: 'effect-toggle' },
    patchLevel: 112,
  },
  'synth-pad': {
    id: 'synth-pad',
    labelEn: 'Synth + pad',
    chain: LIGHT_CHORUS,
    defaultLevels: {
      pcm1Level: 70,
      pcm2Level: 40,
      modelingLevel: 0,
      normalLevel: 0,
      pcm1On: true,
      pcm2On: true,
      modelingOn: false,
      normalOn: false,
    },
    defaultCtlExp: { ctl: 'tone-switch', exp: 'filter', expSw: 'effect-toggle' },
    patchLevel: 110,
  },
  'model-plus-pad': {
    id: 'model-plus-pad',
    labelEn: 'Modeling + pad layer',
    chain: AMP_CLEAN,
    defaultLevels: {
      pcm1Level: 0,
      pcm2Level: 20,
      modelingLevel: 85,
      normalLevel: 0,
      pcm1On: false,
      pcm2On: true,
      modelingOn: true,
      normalOn: false,
      pcm2Standby: true,
    },
    defaultCtlExp: { ctl: 'tone-switch', exp: 'volume', expSw: 'effect-toggle' },
    patchLevel: 115,
  },
  'model-plus-keys': {
    id: 'model-plus-keys',
    labelEn: 'Modeling + keys',
    chain: AMP_CLEAN,
    defaultLevels: {
      pcm1Level: 25,
      pcm2Level: 0,
      modelingLevel: 80,
      normalLevel: 0,
      pcm1On: true,
      pcm2On: false,
      modelingOn: true,
      normalOn: false,
      pcm2Standby: false,
    },
    defaultCtlExp: { ctl: 'tone-switch', exp: 'volume', expSw: 'effect-toggle' },
    patchLevel: 114,
  },
};

export function architectureOf(id: ArchitectureId): ArchitectureTemplate {
  return ARCHITECTURES[id];
}
