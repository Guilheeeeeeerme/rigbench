import type { Gr55Editor } from './editor';
import { TEMPORARY_PATCH } from './patchLayout';
import type { Gr55System } from './systemState';
import { gkSet, SYSTEM } from './systemMap';

export type TroubleId =
  | 'ghost-notes'
  | 'missing-notes'
  | 'uneven-volume'
  | 'tracking-delay'
  | 'unexpected-bends'
  | 'excess-sustain'
  | 'wrong-output'
  | 'no-normal-pu'
  | 'pedal-override';

export interface TroubleFlow {
  id: TroubleId;
  titleEn: string;
  titlePt: string;
  stepsEn: readonly string[];
  stepsPt: readonly string[];
  /** Honest: we never claim live meter reads. */
  applyHintEn: string;
  applyHintPt: string;
  /** Apply writes temporary-patch isolation (needs editor). */
  needsEditor?: boolean;
}

export const TROUBLE_FLOWS: readonly TroubleFlow[] = [
  {
    id: 'ghost-notes',
    titleEn: 'Ghost / unwanted notes (5-min calibrate)',
    titlePt: 'Notas fantasmas / indesejadas (calibrar 5 min)',
    stepsEn: [
      'Apply the suggested fix first — it isolates Pop Piano 1 on PCM1, mutes other sources, and clears FX so ghosts are easy to hear. Temporary patch only.',
      'On the pedal, open the active GK set SENS meters. This app cannot read live string levels over MIDI.',
      'For each string (~45 s): play your softest accidental touch, then a firm fretted note. Aim SENS so hard hits near the top of the meter without false triggers from soft touches (start around 25–30 for nylon piezo).',
      'Set Low Velocity Cut (Unwanted notes) between 5 and 8. Raise one step if ghosts remain; lower if quiet notes disappear.',
      'When clean, re-apply your musical sound (Choose a sound). GK SENS / LVC stay in SYSTEM.',
    ],
    stepsPt: [
      'Aplique a correção sugerida primeiro — isola Pop Piano 1 no PCM1, muda outras fontes e limpa FX para ouvir fantasmas com clareza. Só o patch temporário.',
      'Na pedaleira, abra os medidores de SENS do GK set ativo. Este app não lê níveis de corda ao vivo via MIDI.',
      'Por corda (~45 s): toque o toque acidental mais leve, depois uma nota firme. Ajuste SENS para ataques fortes perto do topo sem disparos falsos (comece em ~25–30 no piezo nylon).',
      'Defina Low Velocity Cut (Notas indesejadas) entre 5 e 8. Suba um passo se ainda houver fantasmas; baixe se notas quietas sumirem.',
      'Quando estiver limpo, reaplique o som musical (Escolher um som). SENS / LVC do GK ficam no SYSTEM.',
    ],
    applyHintEn:
      'Isolates Pop Piano 1 (temp patch) and seeds Low Velocity Cut to 5 on the active GK set (SYSTEM). Finish SENS on the pedal meter.',
    applyHintPt:
      'Isola Pop Piano 1 (patch temp) e coloca Low Velocity Cut em 5 no GK set ativo (SYSTEM). Finalize a SENS no medidor da pedaleira.',
    needsEditor: true,
  },
  {
    id: 'missing-notes',
    titleEn: 'Missing notes',
    titlePt: 'Notas perdidas',
    stepsEn: [
      'Play firmly on the quietest string.',
      'Raise that string’s SENS so strong hits reach near the top of the pedal meter.',
      'Lower Play Feel if dynamics feel crushed.',
    ],
    stepsPt: [
      'Toque firme na corda mais fraca.',
      'Suba a SENS dessa corda até o ataque forte chegar perto do topo do medidor.',
      'Baixe Play Feel se a dinâmica parecer esmagada.',
    ],
    applyHintEn: 'Nudges Velocity Dynamics up on the active GK set.',
    applyHintPt: 'Sobe um pouco Velocity Dynamics no GK set ativo.',
  },
  {
    id: 'uneven-volume',
    titleEn: 'Uneven string volumes',
    titlePt: 'Volumes desiguais entre cordas',
    stepsEn: [
      'Compare the six SENS values on the pedal.',
      'Balance so each string peaks similarly on hard hits.',
      'This app can seed equal SENS; fine-tune with the pedal meter.',
    ],
    stepsPt: [
      'Compare os seis valores de SENS na pedaleira.',
      'Equilibre para cada corda chegar perto do pico no ataque forte.',
      'O app pode igualar a SENS; o ajuste fino é no medidor da pedaleira.',
    ],
    applyHintEn: 'Sets all six SENS to the median of current values.',
    applyHintPt: 'Iguala as seis SENS à mediana atual.',
  },
  {
    id: 'tracking-delay',
    titleEn: 'Tracking delay',
    titlePt: 'Atraso de tracking',
    stepsEn: [
      'Prefer GK-3/2A geometry and correct PU↔bridge distance for magnetics.',
      'Piezo types ignore distance — focus on SENS and attack.',
      'Software cannot remove physical latency.',
    ],
    stepsPt: [
      'Prefira geometria GK-3/2A e distância PU↔ponte correta nos magnéticos.',
      'Tipos piezo ignoram distância — foque em SENS e ataque.',
      'Software não remove latência física.',
    ],
    applyHintEn: 'No automatic write — guidance only.',
    applyHintPt: 'Sem escrita automática — só orientação.',
  },
  {
    id: 'unexpected-bends',
    titleEn: 'Unexpected bends',
    titlePt: 'Bends inesperados',
    stepsEn: [
      'For fretted chromatic instruments, enable Chromatic on the PCM tone.',
      'For sax/lead expression, leave Chromatic off so bends follow the string.',
    ],
    stepsPt: [
      'Para instrumentos cromáticos, ligue Chromatic no tom PCM.',
      'Para sax/lead expressivo, deixe Chromatic off para bends seguirem a corda.',
    ],
    applyHintEn: 'Patch-level Chromatic tip only (use Advanced or re-apply preset).',
    applyHintPt: 'Dica de Chromatic no patch (use Avançado ou reaplique o preset).',
  },
  {
    id: 'excess-sustain',
    titleEn: 'Excessive sustain',
    titlePt: 'Sustain excessivo',
    stepsEn: ['Lower Nuance Dynamics or raise Nuance Trim on the GK set.', 'Check HOLD is not latched on CTL.'],
    stepsPt: [
      'Baixe Nuance Dynamics ou suba Nuance Trim no GK set.',
      'Confira se HOLD não ficou travado no CTL.',
    ],
    applyHintEn: 'Raises Nuance Trim on the active GK set.',
    applyHintPt: 'Sobe Nuance Trim no GK set ativo.',
  },
  {
    id: 'wrong-output',
    titleEn: 'Incorrect output routing',
    titlePt: 'Saída / roteamento errado',
    stepsEn: [
      'OUTPUT SELECT is pedal-wide (SYSTEM).',
      'Headphones always hear a phones-optimized path.',
      'GUITAR OUT is separate from OUTPUT jacks.',
    ],
    stepsPt: [
      'OUTPUT SELECT é do pedal inteiro (SYSTEM).',
      'Fones sempre ouvem caminho otimizado.',
      'GUITAR OUT é separado das saídas OUTPUT.',
    ],
    applyHintEn: 'Sets OUTPUT SELECT to LINE/PHONES.',
    applyHintPt: 'Define OUTPUT SELECT como LINE/PHONES.',
  },
  {
    id: 'no-normal-pu',
    titleEn: 'No normal pickup sound',
    titlePt: 'Sem som do captador normal',
    stepsEn: [
      'Set the GK selector to MIX or GUITAR on the hardware.',
      'Unmute Normal PU in Advanced / Tone Deck.',
      'Check SYSTEM GUITAR OUT if you expect the GUITAR OUT jack.',
    ],
    stepsPt: [
      'Coloque o seletor GK em MIX ou GUITAR no hardware.',
      'Desmute Normal PU em Avançado / Tone Deck.',
      'Confira SYSTEM GUITAR OUT se espera o jack GUITAR OUT.',
    ],
    applyHintEn: 'No automatic write — hardware switch + Tone Deck.',
    applyHintPt: 'Sem escrita automática — chave no hardware + Tone Deck.',
  },
  {
    id: 'pedal-override',
    titleEn: 'Pedals override tone settings',
    titlePt: 'Pedais sobrescrevem o timbre',
    stepsEn: [
      'If SYSTEM CTL/EXP is not PATCH SETTING, every patch shares those functions.',
      'Set SYSTEM functions to PATCH SETTING to allow per-patch control.',
    ],
    stepsPt: [
      'Se CTL/EXP do SYSTEM não for PATCH SETTING, todos os patches compartilham as funções.',
      'Use PATCH SETTING no SYSTEM para controle por patch.',
    ],
    applyHintEn: 'Sets CTL, EXP, and EXP SW to PATCH SETTING (SYSTEM).',
    applyHintPt: 'Define CTL, EXP e EXP SW como PATCH SETTING (SYSTEM).',
  },
];

/**
 * Isolate a dry piano on PCM1 so ghost notes are audible without FX/layers.
 * Temporary patch only — does not touch SYSTEM/GK.
 */
export function applyGhostNoteIsolate(editor: Gr55Editor): { wrote: number } {
  const patch = TEMPORARY_PATCH;
  let wrote = 0;
  const write = (field: Parameters<Gr55Editor['write']>[0], value: unknown) => {
    editor.write(field as never, value as never);
    wrote++;
  };
  const MUTE = true;
  const SOUND = false;

  write(patch.patchPCMTone1.toneSelect, 'Pop Piano 1');
  write(patch.patchPCMTone1.partLevel, 100);
  write(patch.patchPCMTone1.muteSwitch, SOUND);
  write(patch.patchPCMTone1.chromatic, true);
  write(patch.patchPCMTone1.partCoarseTune, 0);
  write(patch.patchPCMTone1.partOutputMFXSelect, 'BYPS');

  write(patch.patchPCMTone2.muteSwitch, MUTE);
  write(patch.patchPCMTone2.partLevel, 0);
  write(patch.modelingTone.muteSwitch, MUTE);
  write(patch.modelingTone.level, 0);
  write(patch.common.normalPuMute, MUTE);
  write(patch.common.normalPuLevel, 0);

  write(patch.ampModNs.ampSwitch, false);
  write(patch.ampModNs.modSwitch, false);
  write(patch.mfx.mfxSwitch, false);
  write(patch.sendsAndEq.chorusSwitch, false);
  write(patch.sendsAndEq.delaySwitch, false);
  write(patch.sendsAndEq.reverbSwitch, false);
  write(patch.sendsAndEq.eqSwitch, false);

  write(patch.common.patchLevel, 110);
  write(patch.common.patchName, 'Ghost check     ');

  return { wrote };
}

export function applyTroubleFix(
  system: Gr55System,
  id: TroubleId,
  editor?: Gr55Editor,
): { wrote: number; messageEn: string } {
  const select = system.read(SYSTEM.common.gkSetSelect);
  const setNumber = select.ok ? select.value + 1 : 1;
  const set = gkSet(setNumber);
  let wrote = 0;

  switch (id) {
    case 'ghost-notes': {
      let message = '';
      if (editor) {
        const isolate = applyGhostNoteIsolate(editor);
        wrote += isolate.wrote;
        message = `Isolated Pop Piano 1 (${isolate.wrote} patch writes). `;
      }
      system.write(set.lowVelocityCut, 5);
      wrote += 1;
      return { wrote, messageEn: `${message}Low Velocity Cut → 5 (test 5–8 on pedal)` };
    }
    case 'missing-notes': {
      const cur = system.read(set.velocityDynamics);
      const next = Math.min(10, (cur.ok ? cur.value : 5) + 1);
      system.write(set.velocityDynamics, next);
      wrote = 1;
      return { wrote, messageEn: `Velocity Dynamics → ${next}` };
    }
    case 'uneven-volume': {
      const sensFields = [
        set.string1Sens,
        set.string2Sens,
        set.string3Sens,
        set.string4Sens,
        set.string5Sens,
        set.string6Sens,
      ] as const;
      const values = sensFields.map((field) => {
        const read = system.read(field);
        return read.ok ? read.value : 50;
      });
      const sorted = [...values].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)] ?? 50;
      for (const field of sensFields) {
        system.write(field, median);
        wrote++;
      }
      return { wrote, messageEn: `All SENS → ${median}` };
    }
    case 'excess-sustain': {
      const cur = system.read(set.nuanceTrim);
      const next = Math.min(10, (cur.ok ? cur.value : 5) + 1);
      system.write(set.nuanceTrim, next);
      wrote = 1;
      return { wrote, messageEn: `Nuance Trim → ${next}` };
    }
    case 'wrong-output': {
      system.write(SYSTEM.common.outputSelect, 'LINE/PHONES');
      return { wrote: 1, messageEn: 'OUTPUT SELECT → LINE/PHONES' };
    }
    case 'pedal-override': {
      system.write(SYSTEM.pedals.ctlFunction, 'PATCH SETTING');
      system.write(SYSTEM.pedals.expOffFunction, 'PATCH SETTING');
      system.write(SYSTEM.pedals.expOnFunction, 'PATCH SETTING');
      system.write(SYSTEM.pedals.expSwFunction, 'PATCH SETTING');
      return { wrote: 4, messageEn: 'CTL/EXP/EXP SW → PATCH SETTING' };
    }
    default:
      return { wrote: 0, messageEn: 'Guidance only — no automatic write.' };
  }
}
