export type CtlActionId =
  | 'solo-boost'
  | 'effect-toggle'
  | 'tone-switch'
  | 'sustain'
  | 'octave';

export type ExpActionId = 'volume' | 'expression' | 'wah' | 'filter' | 'blend';

export type ExpSwActionId = 'wah-on' | 'effect-toggle' | 'expression-mode';

export interface MusicalAction<Id extends string> {
  id: Id;
  labelEn: string;
  labelPt: string;
  /** SYSTEM pedal FUNCTION must be PATCH SETTING for patch-layer control. */
  requiresPatchSetting: boolean;
  /** High-level MASTER PEDAL function label when mapped simply. */
  systemFunction?: string;
  technicalEn: string;
}

export const CTL_ACTIONS: readonly MusicalAction<CtlActionId>[] = [
  {
    id: 'solo-boost',
    labelEn: 'Solo boost',
    labelPt: 'Boost de solo',
    requiresPatchSetting: true,
    systemFunction: 'AMP SW',
    technicalEn: 'AMP SOLO / AMP SW via PATCH SETTING',
  },
  {
    id: 'effect-toggle',
    labelEn: 'Toggle effect',
    labelPt: 'Ligar/desligar efeito',
    requiresPatchSetting: true,
    systemFunction: 'MOD SW',
    technicalEn: 'MOD SW (PATCH SETTING)',
  },
  {
    id: 'tone-switch',
    labelEn: 'Switch timbre',
    labelPt: 'Alternar timbre',
    requiresPatchSetting: true,
    systemFunction: 'TONE SW',
    technicalEn: 'TONE SW (PATCH SETTING)',
  },
  {
    id: 'sustain',
    labelEn: 'Sustain / hold',
    labelPt: 'Sustain',
    requiresPatchSetting: true,
    systemFunction: 'HOLD',
    technicalEn: 'HOLD (CTL, PATCH SETTING)',
  },
  {
    id: 'octave',
    labelEn: 'Octave',
    labelPt: 'Oitava',
    requiresPatchSetting: true,
    technicalEn: 'ASSIGN → Part Octave (avoid conflicting ASSIGN slots)',
  },
];

export const EXP_ACTIONS: readonly MusicalAction<ExpActionId>[] = [
  {
    id: 'volume',
    labelEn: 'Volume',
    labelPt: 'Volume',
    requiresPatchSetting: true,
    systemFunction: 'PATCH VOLUME',
    technicalEn: 'PATCH VOLUME (PATCH SETTING)',
  },
  {
    id: 'expression',
    labelEn: 'Expression / dynamics',
    labelPt: 'Expressão / dinâmica',
    requiresPatchSetting: true,
    systemFunction: 'TONE VOLUME',
    technicalEn: 'TONE VOLUME (PATCH SETTING)',
  },
  {
    id: 'wah',
    labelEn: 'Wah',
    labelPt: 'Wah',
    requiresPatchSetting: true,
    systemFunction: 'MOD CONTROL',
    technicalEn: 'MOD CONTROL → WAH (MODE=MANUAL)',
  },
  {
    id: 'filter',
    labelEn: 'Filter opening',
    labelPt: 'Abertura de filtro',
    requiresPatchSetting: true,
    systemFunction: 'MOD CONTROL',
    technicalEn: 'MOD CONTROL / filter target via ASSIGN',
  },
  {
    id: 'blend',
    labelEn: 'Blend between sounds',
    labelPt: 'Mistura entre sons',
    requiresPatchSetting: true,
    systemFunction: 'CROSS FADER',
    technicalEn: 'CROSS FADER (PATCH SETTING)',
  },
];

export const EXP_SW_ACTIONS: readonly MusicalAction<ExpSwActionId>[] = [
  {
    id: 'wah-on',
    labelEn: 'Enable wah',
    labelPt: 'Ativar wah',
    requiresPatchSetting: true,
    systemFunction: 'MOD SW',
    technicalEn: 'EXP SW → MOD SW',
  },
  {
    id: 'effect-toggle',
    labelEn: 'Toggle effect',
    labelPt: 'Alternar efeito',
    requiresPatchSetting: true,
    systemFunction: 'MFX SW',
    technicalEn: 'EXP SW → MFX SW',
  },
  {
    id: 'expression-mode',
    labelEn: 'Change expression mode',
    labelPt: 'Mudar modo de expressão',
    requiresPatchSetting: true,
    technicalEn: 'EXP ON function vs EXP OFF (PATCH SETTING)',
  },
];

export function ctlAction(id: string) {
  return CTL_ACTIONS.find((action) => action.id === id);
}
export function expAction(id: string) {
  return EXP_ACTIONS.find((action) => action.id === id);
}
export function expSwAction(id: string) {
  return EXP_SW_ACTIONS.find((action) => action.id === id);
}
