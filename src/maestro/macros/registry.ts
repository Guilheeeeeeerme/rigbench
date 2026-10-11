import { SCALE_BASE_MM } from '../../devices/gr55/systemMap';
import { macroSessionOf, type SessionId } from '../session';
import type { MacroGroup, MacroOption, PatchWrite, SystemWrite } from './types';

const p = (key: string, value: unknown): PatchWrite => ({ domain: 'patch', key, value });
const s = (ref: string, value: unknown): SystemWrite => ({ domain: 'system', ref, value });

const ST_SCALE = 648 - SCALE_BASE_MM;
const MID_SENS = 50;

function pills(
  session: SessionId,
  id: string,
  titleEn: string,
  titlePt: string,
  options: readonly MacroOption[],
  implemented: boolean,
): MacroGroup {
  return { session, id, kind: 'pills', titleEn, titlePt, options, implemented };
}

/** Mute semantics: inverted mute fields — `true` = MUTE, `false` = sounding. */
const MUTE = true;
const SOUND = false;

// ── Patch: priority implementations ─────────────────────────────────────────

const layers: MacroGroup = pills(
  'patch',
  'layers',
  'Layers',
  'Camadas',
  [
    {
      id: 'guitar-only',
      labelEn: 'Guitar only',
      labelPt: 'Só guitarra',
      writes: [
        p('pcm1/tone/muteSwitch', MUTE),
        p('pcm2/tone/muteSwitch', MUTE),
        p('modeling/tone/muteSwitch', MUTE),
        p('normal-pickup/level/normalPuMute', SOUND),
        p('normal-pickup/level/normalPuLevel', 80),
      ],
    },
    {
      id: 'modeled-guitar',
      labelEn: 'Modeled guitar',
      labelPt: 'Guitarra modelada',
      writes: [
        p('pcm1/tone/muteSwitch', MUTE),
        p('pcm2/tone/muteSwitch', MUTE),
        p('modeling/tone/muteSwitch', SOUND),
        p('modeling/tone/level', 80),
        p('normal-pickup/level/normalPuMute', MUTE),
        p('normal-pickup/level/normalPuLevel', 20),
      ],
    },
    {
      id: 'synth-lead',
      labelEn: 'Synth lead',
      labelPt: 'Synth lead',
      writes: [
        p('pcm1/tone/muteSwitch', SOUND),
        p('pcm1/tone/partLevel', 90),
        p('pcm2/tone/muteSwitch', MUTE),
        p('pcm2/tone/partLevel', 20),
        p('modeling/tone/muteSwitch', MUTE),
        p('normal-pickup/level/normalPuMute', MUTE),
      ],
    },
    {
      id: 'full-stack',
      labelEn: 'Full stack',
      labelPt: 'Pilha cheia',
      writes: [
        p('pcm1/tone/muteSwitch', SOUND),
        p('pcm1/tone/partLevel', 70),
        p('pcm2/tone/muteSwitch', SOUND),
        p('pcm2/tone/partLevel', 60),
        p('modeling/tone/muteSwitch', SOUND),
        p('modeling/tone/level', 60),
        p('normal-pickup/level/normalPuMute', SOUND),
        p('normal-pickup/level/normalPuLevel', 55),
      ],
    },
  ],
  true,
);

const ampGrit: MacroGroup = pills(
  'patch',
  'amp-grit',
  'Amp & grit',
  'Amp e pegada',
  [
    {
      id: 'clean-open',
      labelEn: 'Clean open',
      labelPt: 'Limpo aberto',
      writes: [
        p('amp/amp/ampSwitch', true),
        p('amp/amp/ampType', 'BOSS CLEAN'),
        p('amp/amp/ampGain', 25),
        p('amp/amp/ampGainSwitch', 'LOW'),
        p('amp/amp/ampLevel', 70),
        p('amp/noise-suppressor/nsSwitch', false),
        p('amp/noise-suppressor/nsThreshold', 10),
      ],
    },
    {
      id: 'warm-studio',
      labelEn: 'Warm studio',
      labelPt: 'Quente estúdio',
      writes: [
        p('amp/amp/ampSwitch', true),
        p('amp/amp/ampType', 'BLUES'),
        p('amp/amp/ampGain', 45),
        p('amp/amp/ampGainSwitch', 'MID'),
        p('amp/amp/ampLevel', 70),
        p('amp/noise-suppressor/nsSwitch', true),
        p('amp/noise-suppressor/nsThreshold', 30),
      ],
    },
    {
      id: 'crunch-stage',
      labelEn: 'Crunch stage',
      labelPt: 'Crunch palco',
      writes: [
        p('amp/amp/ampSwitch', true),
        p('amp/amp/ampType', 'BOSS CRUNCH'),
        p('amp/amp/ampGain', 70),
        p('amp/amp/ampGainSwitch', 'MID'),
        p('amp/amp/ampLevel', 75),
        p('amp/noise-suppressor/nsSwitch', true),
        p('amp/noise-suppressor/nsThreshold', 45),
      ],
    },
    {
      id: 'high-gain-tight',
      labelEn: 'High-gain tight',
      labelPt: 'High-gain fechado',
      writes: [
        p('amp/amp/ampSwitch', true),
        p('amp/amp/ampType', 'MS HIGAIN'),
        p('amp/amp/ampGain', 95),
        p('amp/amp/ampGainSwitch', 'HIGH'),
        p('amp/amp/ampLevel', 70),
        p('amp/noise-suppressor/nsSwitch', true),
        p('amp/noise-suppressor/nsThreshold', 60),
      ],
    },
  ],
  true,
);

const atmosphere: MacroGroup = pills(
  'patch',
  'atmosphere',
  'Atmosphere',
  'Atmosfera',
  [
    {
      id: 'dry',
      labelEn: 'Dry',
      labelPt: 'Seco',
      writes: [
        p('chorus/chorus/chorusSwitch', false),
        p('delay/delay/delaySwitch', false),
        p('reverb/reverb/reverbSwitch', false),
        p('chorus/chorus/chorusEffectLevel', 0),
        p('delay/delay/delayEffectLevel', 0),
        p('reverb/reverb/reverbEffectLevel', 0),
      ],
    },
    {
      id: 'slap-room',
      labelEn: 'Slap room',
      labelPt: 'Sala curta',
      writes: [
        p('chorus/chorus/chorusSwitch', false),
        p('delay/delay/delaySwitch', true),
        p('delay/delay/delayType', 'SINGLE'),
        p('delay/delay/delayTime', 120),
        p('delay/delay/delayFeedback', 15),
        p('delay/delay/delayEffectLevel', 35),
        p('reverb/reverb/reverbSwitch', true),
        p('reverb/reverb/reverbType', 'ROOM'),
        p('reverb/reverb/reverbTime', 1.2),
        p('reverb/reverb/reverbEffectLevel', 25),
      ],
    },
    {
      id: 'stage-wash',
      labelEn: 'Stage wash',
      labelPt: 'Lavado de palco',
      writes: [
        p('chorus/chorus/chorusSwitch', true),
        p('chorus/chorus/chorusType', 'STEREO'),
        p('chorus/chorus/chorusDepth', 30),
        p('chorus/chorus/chorusEffectLevel', 25),
        p('delay/delay/delaySwitch', true),
        p('delay/delay/delayType', 'SINGLE'),
        p('delay/delay/delayTime', 320),
        p('delay/delay/delayFeedback', 30),
        p('delay/delay/delayEffectLevel', 40),
        p('reverb/reverb/reverbSwitch', true),
        p('reverb/reverb/reverbType', 'HALL1'),
        p('reverb/reverb/reverbTime', 2.5),
        p('reverb/reverb/reverbEffectLevel', 35),
      ],
    },
    {
      id: 'deep-space',
      labelEn: 'Deep space',
      labelPt: 'Espaço fundo',
      writes: [
        p('chorus/chorus/chorusSwitch', true),
        p('chorus/chorus/chorusType', 'STEREO'),
        p('chorus/chorus/chorusDepth', 50),
        p('chorus/chorus/chorusEffectLevel', 40),
        p('delay/delay/delaySwitch', true),
        p('delay/delay/delayType', 'MODULATE'),
        p('delay/delay/delayTime', 480),
        p('delay/delay/delayFeedback', 45),
        p('delay/delay/delayEffectLevel', 50),
        p('reverb/reverb/reverbSwitch', true),
        p('reverb/reverb/reverbType', 'HALL2'),
        p('reverb/reverb/reverbTime', 4.5),
        p('reverb/reverb/reverbEffectLevel', 50),
      ],
    },
  ],
  true,
);

const synthVoice: MacroGroup = pills(
  'patch',
  'synth-voice',
  'Synth voice',
  'Voz do synth',
  [
    {
      id: 'off',
      labelEn: 'Off',
      labelPt: 'Desligado',
      writes: [p('pcm1/tone/muteSwitch', MUTE), p('pcm2/tone/muteSwitch', MUTE)],
    },
    {
      id: 'soft-pad',
      labelEn: 'Soft pad',
      labelPt: 'Pad suave',
      writes: [
        p('pcm1/tone/muteSwitch', SOUND),
        p('pcm1/tone/partLevel', 55),
        p('pcm1/tone/partPan', 50),
        p('pcm2/tone/muteSwitch', MUTE),
        p('pcm2/tone/partLevel', 20),
      ],
    },
    {
      id: 'bright-lead',
      labelEn: 'Bright lead',
      labelPt: 'Lead brilhante',
      writes: [
        p('pcm1/tone/muteSwitch', SOUND),
        p('pcm1/tone/partLevel', 90),
        p('pcm1/tone/partPan', 50),
        p('pcm2/tone/muteSwitch', MUTE),
      ],
    },
    {
      id: 'dual-layer',
      labelEn: 'Dual layer',
      labelPt: 'Duas camadas',
      writes: [
        p('pcm1/tone/muteSwitch', SOUND),
        p('pcm1/tone/partLevel', 70),
        p('pcm1/tone/partPan', 30),
        p('pcm2/tone/muteSwitch', SOUND),
        p('pcm2/tone/partLevel', 65),
        p('pcm2/tone/partPan', 70),
      ],
    },
  ],
  true,
);

const guitarBody: MacroGroup = pills(
  'patch',
  'guitar-body',
  'Guitar body',
  'Corpo da guitarra',
  [
    {
      id: 'silent',
      labelEn: 'Silent',
      labelPt: 'Mudo',
      writes: [p('modeling/tone/muteSwitch', MUTE), p('normal-pickup/level/normalPuMute', MUTE)],
    },
    {
      id: 'pickup',
      labelEn: 'Pickup',
      labelPt: 'Captador',
      writes: [
        p('modeling/tone/muteSwitch', MUTE),
        p('normal-pickup/level/normalPuMute', SOUND),
        p('normal-pickup/level/normalPuLevel', 80),
      ],
    },
    {
      id: 'modeled',
      labelEn: 'Modeled',
      labelPt: 'Modelagem',
      writes: [
        p('modeling/tone/muteSwitch', SOUND),
        p('modeling/tone/level', 80),
        p('normal-pickup/level/normalPuMute', MUTE),
      ],
    },
    {
      id: 'blend',
      labelEn: 'Blend',
      labelPt: 'Mistura',
      writes: [
        p('modeling/tone/muteSwitch', SOUND),
        p('modeling/tone/level', 55),
        p('normal-pickup/level/normalPuMute', SOUND),
        p('normal-pickup/level/normalPuLevel', 55),
      ],
    },
  ],
  true,
);

const loudness: MacroGroup = pills(
  'patch',
  'loudness',
  'Loudness',
  'Volume',
  [
    {
      id: 'practice',
      labelEn: 'Practice',
      labelPt: 'Ensaio',
      writes: [
        p('master/output/patchLevel', 40),
        p('amp/amp/ampLevel', 55),
        p('amp/amp/ampSoloSwitch', false),
      ],
    },
    {
      id: 'stage',
      labelEn: 'Stage',
      labelPt: 'Palco',
      writes: [
        p('master/output/patchLevel', 75),
        p('amp/amp/ampLevel', 70),
        p('amp/amp/ampSoloSwitch', false),
      ],
    },
    {
      id: 'loud',
      labelEn: 'Loud',
      labelPt: 'Alto',
      writes: [
        p('master/output/patchLevel', 90),
        p('amp/amp/ampLevel', 80),
        p('amp/amp/ampSoloSwitch', false),
      ],
    },
    {
      id: 'solo-push',
      labelEn: 'Solo push',
      labelPt: 'Solo',
      writes: [
        p('master/output/patchLevel', 85),
        p('amp/amp/ampLevel', 80),
        p('amp/amp/ampSoloSwitch', true),
        p('amp/amp/ampSoloLevel', 90),
      ],
    },
  ],
  true,
);

const frontEffect: MacroGroup = pills(
  'patch',
  'front-effect',
  'Front effect',
  'Efeito da frente',
  [
    {
      id: 'off',
      labelEn: 'Off',
      labelPt: 'Desligado',
      writes: [p('mod/mod/modSwitch', false)],
    },
    {
      id: 'steady',
      labelEn: 'Steady',
      labelPt: 'Firme',
      writes: [p('mod/mod/modSwitch', true), p('mod/mod/modType', 'COMP')],
    },
    {
      id: 'edge',
      labelEn: 'Edge',
      labelPt: 'Distôrce',
      writes: [p('mod/mod/modSwitch', true), p('mod/mod/modType', 'OD/DS')],
    },
    {
      id: 'sweep',
      labelEn: 'Sweep',
      labelPt: 'Varredura',
      writes: [p('mod/mod/modSwitch', true), p('mod/mod/modType', 'WAH')],
    },
  ],
  true,
);

const colorBox: MacroGroup = pills(
  'patch',
  'color-box',
  'Color box',
  'Caixa de cor',
  [
    {
      id: 'off',
      labelEn: 'Off',
      labelPt: 'Desligado',
      writes: [p('mfx/mfx/mfxSwitch', false)],
    },
    {
      id: 'polish',
      labelEn: 'Polish',
      labelPt: 'Polido',
      writes: [p('mfx/mfx/mfxSwitch', true), p('mfx/mfx/mfxType', 'EQ')],
    },
    {
      id: 'filter',
      labelEn: 'Filter',
      labelPt: 'Filtro',
      writes: [p('mfx/mfx/mfxSwitch', true), p('mfx/mfx/mfxType', 'SUPER FILTER')],
    },
    {
      id: 'wide',
      labelEn: 'Wide',
      labelPt: 'Aberto',
      writes: [p('mfx/mfx/mfxSwitch', true), p('mfx/mfx/mfxType', 'HEXA-CHORUS')],
    },
  ],
  true,
);

/** Stub pill group — listed in UI, apply is a no-op until filled in. */
function stubPills(
  session: SessionId,
  id: string,
  titleEn: string,
  titlePt: string,
  options: readonly { id: string; labelEn: string; labelPt: string }[],
): MacroGroup {
  return pills(
    session,
    id,
    titleEn,
    titlePt,
    options.map((option) => ({ ...option, writes: [] })),
    false,
  );
}

const toneShape: MacroGroup = pills(
  'patch',
  'tone-shape',
  'Tone shape',
  'Forma do tom',
  [
    {
      id: 'dark',
      labelEn: 'Dark',
      labelPt: 'Escuro',
      writes: [
        p('eq/eq/eqSwitch', true),
        p('eq/eq/eqLowGain', 4),
        p('eq/eq/eqLowMidGain', 0),
        p('eq/eq/eqHighMidGain', -2),
        p('eq/eq/eqHighGain', -6),
        p('eq/eq/eqLevel', 0),
      ],
    },
    {
      id: 'natural',
      labelEn: 'Natural',
      labelPt: 'Natural',
      writes: [
        p('eq/eq/eqSwitch', true),
        p('eq/eq/eqLowGain', 0),
        p('eq/eq/eqLowMidGain', 0),
        p('eq/eq/eqHighMidGain', 0),
        p('eq/eq/eqHighGain', 0),
        p('eq/eq/eqLevel', 0),
      ],
    },
    {
      id: 'bright',
      labelEn: 'Bright',
      labelPt: 'Brilhante',
      writes: [
        p('eq/eq/eqSwitch', true),
        p('eq/eq/eqLowGain', -2),
        p('eq/eq/eqLowMidGain', 0),
        p('eq/eq/eqHighMidGain', 3),
        p('eq/eq/eqHighGain', 5),
        p('eq/eq/eqLevel', 0),
      ],
    },
    {
      id: 'scooped',
      labelEn: 'Scooped',
      labelPt: 'Escavado',
      writes: [
        p('eq/eq/eqSwitch', true),
        p('eq/eq/eqLowGain', 5),
        p('eq/eq/eqLowMidGain', -6),
        p('eq/eq/eqHighMidGain', -4),
        p('eq/eq/eqHighGain', 4),
        p('eq/eq/eqLevel', 0),
      ],
    },
  ],
  true,
);

const chainPath: MacroGroup = pills(
  'patch',
  'chain-path',
  'Chain path',
  'Caminho',
  [
    {
      id: 'guitar-amp',
      labelEn: 'Guitar amp path',
      labelPt: 'Caminho do amp',
      writes: [
        p('master/output/effectStructure', '1'),
        p('pcm1/tone/partOutputMFXSelect', 'BYPS'),
        p('pcm2/tone/partOutputMFXSelect', 'BYPS'),
        p('master/output/lineSelectModel', 'AMP'),
        p('normal-pickup/level/lineSelectNormalPU', 'AMP'),
      ],
    },
    {
      id: 'synth-mfx',
      labelEn: 'Synth through MFX',
      labelPt: 'Synth no MFX',
      writes: [
        p('master/output/effectStructure', '1'),
        p('pcm1/tone/partOutputMFXSelect', 'MFX'),
        p('pcm2/tone/partOutputMFXSelect', 'MFX'),
        p('master/output/lineSelectModel', 'BYPS'),
        p('normal-pickup/level/lineSelectNormalPU', 'BYPS'),
      ],
    },
    {
      id: 'series',
      labelEn: 'Everything in series',
      labelPt: 'Tudo em série',
      writes: [
        p('master/output/effectStructure', '2'),
        p('pcm1/tone/partOutputMFXSelect', 'MFX'),
        p('pcm2/tone/partOutputMFXSelect', 'MFX'),
        p('master/output/lineSelectModel', 'AMP'),
        p('normal-pickup/level/lineSelectNormalPU', 'AMP'),
      ],
    },
    {
      id: 'bypass',
      labelEn: 'Bypass coloring',
      labelPt: 'Sem colorir',
      writes: [
        p('master/output/effectStructure', '1'),
        p('pcm1/tone/partOutputMFXSelect', 'BYPS'),
        p('pcm2/tone/partOutputMFXSelect', 'BYPS'),
        p('master/output/lineSelectModel', 'BYPS'),
        p('normal-pickup/level/lineSelectNormalPU', 'BYPS'),
      ],
    },
  ],
  true,
);

const patchMonitor = stubPills('patch', 'patch-monitor', 'Patch monitor', 'Monitor do patch', [
  { id: 'off', labelEn: 'Jack off', labelPt: 'Jack off' },
  { id: 'normal-pu', labelEn: 'Normal PU', labelPt: 'Captador' },
  { id: 'modeling', labelEn: 'Modeling', labelPt: 'Modelagem' },
  { id: 'both', labelEn: 'Both', labelPt: 'Ambos' },
]);

const tuning: MacroGroup = pills(
  'patch',
  'tuning',
  'Tuning',
  'Afinação',
  [
    {
      id: 'standard',
      labelEn: 'Standard',
      labelPt: 'Padrão',
      writes: [p('master/tuning/altTuneSwitch', false)],
    },
    {
      id: 'drop',
      labelEn: 'Drop feel',
      labelPt: 'Drop',
      writes: [
        p('master/tuning/altTuneSwitch', true),
        p('master/tuning/altTuneType', 'DROP-D'),
      ],
    },
    {
      id: 'open',
      labelEn: 'Open',
      labelPt: 'Aberta',
      writes: [
        p('master/tuning/altTuneSwitch', true),
        p('master/tuning/altTuneType', 'OPEN-G'),
      ],
    },
    {
      id: 'custom',
      labelEn: 'Custom',
      labelPt: 'Personalizada',
      writes: [],
      opensAdvanced: true,
    },
  ],
  true,
);

const patchFeet: MacroGroup = pills(
  'patch',
  'patch-feet',
  'Patch feet',
  'Pés do patch',
  [
    {
      id: 'volume',
      labelEn: 'Volume swell',
      labelPt: 'Volume',
      writes: [
        p('pedal-gk/ctl/status', true),
        p('pedal-gk/ctl/function', 'OFF'),
        p('pedal-gk/exp-off/function', 'PATCH VOLUME'),
        p('pedal-gk/exp-on/function', 'PATCH VOLUME'),
        p('pedal-gk/exp-switch/status', true),
        p('pedal-gk/exp-switch/function', 'OFF'),
      ],
    },
    {
      id: 'morph',
      labelEn: 'Expression morph',
      labelPt: 'Morfagem',
      writes: [
        p('pedal-gk/ctl/status', true),
        p('pedal-gk/ctl/function', 'TONE SW'),
        p('pedal-gk/ctl/holdSwitchMode', 'LATCH'),
        p('pedal-gk/exp-off/function', 'CROSS FADER'),
        p('pedal-gk/exp-on/function', 'CROSS FADER'),
        p('pedal-gk/exp-switch/status', true),
        p('pedal-gk/exp-switch/function', 'OFF'),
      ],
    },
    {
      id: 'solo',
      labelEn: 'Solo boost',
      labelPt: 'Boost de solo',
      writes: [
        p('pedal-gk/ctl/status', true),
        p('pedal-gk/ctl/function', 'AMP SW'),
        p('pedal-gk/exp-off/function', 'PATCH VOLUME'),
        p('pedal-gk/exp-on/function', 'PATCH VOLUME'),
        p('pedal-gk/exp-switch/status', true),
        p('pedal-gk/exp-switch/function', 'OFF'),
      ],
    },
    {
      id: 'safe',
      labelEn: 'Safe default',
      labelPt: 'Seguro',
      writes: [
        p('pedal-gk/ctl/status', true),
        p('pedal-gk/ctl/function', 'HOLD'),
        p('pedal-gk/ctl/holdSwitchMode', 'LATCH'),
        p('pedal-gk/exp-off/function', 'PATCH VOLUME'),
        p('pedal-gk/exp-on/function', 'PATCH VOLUME'),
        p('pedal-gk/exp-switch/status', true),
        p('pedal-gk/exp-switch/function', 'OFF'),
      ],
    },
  ],
  true,
);

const patchName: MacroGroup = {
  session: 'patch',
  id: 'name',
  kind: 'rename',
  titleEn: 'Name',
  titlePt: 'Nome',
  options: [],
  implemented: false,
};

// ── System ──────────────────────────────────────────────────────────────────

const instrument: MacroGroup = pills(
  'system',
  'instrument',
  'Instrument',
  'Instrumento',
  [
    {
      id: 'gk3-guitar',
      labelEn: 'GK-3 guitar',
      labelPt: 'Guitarra GK-3',
      writes: [
        s('gkSet.active.puType', 'GK-3'),
        s('gkSet.active.scale', ST_SCALE),
        s('gkSet.active.puPhase', 'NORMAL'),
        s('gkSet.active.puDirection', 'NORMAL'),
        s('gkSet.active.normalPuGain', 0),
        s('gkSet.active.string1Sens', MID_SENS),
        s('gkSet.active.string2Sens', MID_SENS),
        s('gkSet.active.string3Sens', MID_SENS),
        s('gkSet.active.string4Sens', MID_SENS),
        s('gkSet.active.string5Sens', MID_SENS),
        s('gkSet.active.string6Sens', MID_SENS),
      ],
    },
    {
      id: 'piezo-acoustic',
      labelEn: 'Piezo acoustic',
      labelPt: 'Violão piezo',
      writes: [
        s('gkSet.active.puType', 'PIEZO'),
        s('gkSet.active.scale', ST_SCALE),
        s('gkSet.active.puPhase', 'NORMAL'),
        s('gkSet.active.puDirection', 'NORMAL'),
        s('gkSet.active.normalPuGain', 0),
        s('gkSet.active.string1Sens', MID_SENS),
        s('gkSet.active.string2Sens', MID_SENS),
        s('gkSet.active.string3Sens', MID_SENS),
        s('gkSet.active.string4Sens', MID_SENS),
        s('gkSet.active.string5Sens', MID_SENS),
        s('gkSet.active.string6Sens', MID_SENS),
      ],
    },
    {
      id: 'bass-gk',
      labelEn: 'Bass GK',
      labelPt: 'Baixo GK',
      writes: [
        // Bass PU TYPE family is mode-gated; stage a long-scale GK profile as a start.
        s('gkSet.active.puType', 'GK-3'),
        s('gkSet.active.scale', 160),
        s('gkSet.active.puPhase', 'NORMAL'),
        s('gkSet.active.puDirection', 'NORMAL'),
      ],
    },
    {
      id: 'keep-edit',
      labelEn: 'Keep & edit',
      labelPt: 'Manter e editar',
      writes: [],
      opensAdvanced: true,
    },
  ],
  true,
);

const speakers: MacroGroup = pills(
  'system',
  'speakers',
  'Speakers',
  'Caixas',
  [
    {
      id: 'phones',
      labelEn: 'Headphones / line',
      labelPt: 'Fones / linha',
      writes: [s('common.outputSelect', 'LINE/PHONES')],
    },
    {
      id: 'combo',
      labelEn: 'Combo amp',
      labelPt: 'Amplificador combo',
      writes: [s('common.outputSelect', 'JC-120')],
    },
    {
      id: 'stack',
      labelEn: 'Stack / return',
      labelPt: 'Stack / return',
      writes: [s('common.outputSelect', 'STACK')],
    },
    {
      id: 'bass-amp',
      labelEn: 'Bass amp',
      labelPt: 'Amp de baixo',
      writes: [s('common.outputSelect', 'B-AMP WITH TWEETER')],
    },
  ],
  true,
);

const globalFeet = stubPills('system', 'global-feet', 'Global feet', 'Pés globais', [
  { id: 'follow-patch', labelEn: 'Follow each patch', labelPt: 'Seguir cada patch' },
  { id: 'volume', labelEn: 'Volume everywhere', labelPt: 'Volume em tudo' },
  { id: 'hold-swell', labelEn: 'Hold + swell', labelPt: 'Hold + swell' },
  { id: 'effects', labelEn: 'Effects at feet', labelPt: 'Efeitos nos pés' },
]);

const monitorJack = stubPills('system', 'monitor-jack', 'Monitor jack', 'Jack monitor', [
  { id: 'per-patch', labelEn: 'Decide per patch', labelPt: 'Por patch' },
  { id: 'normal-pu', labelEn: 'Always normal PU', labelPt: 'Sempre captador' },
  { id: 'modeling', labelEn: 'Always modeling', labelPt: 'Sempre modelagem' },
  { id: 'both', labelEn: 'Always both', labelPt: 'Sempre ambos' },
]);

const midiUsb = stubPills('system', 'midi-usb', 'MIDI & USB', 'MIDI e USB', [
  { id: 'local', labelEn: 'Local only', labelPt: 'Só local' },
  { id: 'receive', labelEn: 'Receive patches', labelPt: 'Receber patches' },
  { id: 'g2m-poly', labelEn: 'Guitar→MIDI poly', labelPt: 'Guitarra→MIDI poly' },
  { id: 'g2m-mono', labelEn: 'Guitar→MIDI mono', labelPt: 'Guitarra→MIDI mono' },
]);

const guitarOrBass: MacroGroup = {
  session: 'system',
  id: 'guitar-or-bass',
  kind: 'mode',
  titleEn: 'Guitar or bass',
  titlePt: 'Guitarra ou baixo',
  options: [
    {
      id: 'guitar',
      labelEn: 'Guitar',
      labelPt: 'Guitarra',
      writes: [s('common.guitarBassSelect', 'GUITAR')],
    },
    {
      id: 'bass',
      labelEn: 'Bass',
      labelPt: 'Baixo',
      writes: [s('common.guitarBassSelect', 'BASS')],
    },
  ],
  // Destructive; keep as stub in v1 — use Device / Wizard.
  implemented: false,
};

const care: MacroGroup = {
  session: 'system',
  id: 'care',
  kind: 'actions',
  titleEn: 'Care',
  titlePt: 'Cuidado',
  options: [
    { id: 'backup', labelEn: 'Backup system .syx', labelPt: 'Backup do sistema .syx', writes: [] },
    {
      id: 'restore',
      labelEn: 'Restore system .syx',
      labelPt: 'Restaurar sistema .syx',
      writes: [],
    },
  ],
  implemented: false,
};

// ── Library ─────────────────────────────────────────────────────────────────

const styleBank: MacroGroup = pills(
  'library',
  'style-bank',
  'Style bank',
  'Banco de estilo',
  [
    {
      id: 'lead',
      labelEn: 'Lead',
      labelPt: 'Lead',
      writes: [{ domain: 'library', action: 'filter', style: 'lead' }],
    },
    {
      id: 'rhythm',
      labelEn: 'Rhythm',
      labelPt: 'Rhythm',
      writes: [{ domain: 'library', action: 'filter', style: 'rhythm' }],
    },
    {
      id: 'other',
      labelEn: 'Other / pads',
      labelPt: 'Outros',
      writes: [{ domain: 'library', action: 'filter', style: 'other' }],
    },
    {
      id: 'user',
      labelEn: 'User slots',
      labelPt: 'User',
      writes: [{ domain: 'library', action: 'filter', style: 'user' }],
    },
  ],
  true,
);

const loadCraft: MacroGroup = {
  session: 'library',
  id: 'load-craft',
  kind: 'actions',
  titleEn: 'Load into craft',
  titlePt: 'Carregar para editar',
  options: [],
  implemented: false,
};

const saveLibrary: MacroGroup = {
  session: 'library',
  id: 'save',
  kind: 'actions',
  titleEn: 'Save',
  titlePt: 'Salvar',
  options: [],
  implemented: false,
};

/** All macro groups from the Maestro-first UX spec (scaffolded; some stubbed). */
export const MACRO_GROUPS: readonly MacroGroup[] = [
  instrument,
  speakers,
  globalFeet,
  monitorJack,
  midiUsb,
  guitarOrBass,
  care,
  layers,
  synthVoice,
  guitarBody,
  ampGrit,
  toneShape,
  frontEffect,
  colorBox,
  atmosphere,
  chainPath,
  loudness,
  patchMonitor,
  tuning,
  patchFeet,
  patchName,
  styleBank,
  loadCraft,
  saveLibrary,
];

export function groupsForSession(session: SessionId): MacroGroup[] {
  const key = macroSessionOf(session);
  return MACRO_GROUPS.filter((group) => group.session === key);
}

export function findGroup(id: string): MacroGroup | undefined {
  return MACRO_GROUPS.find((group) => group.id === id);
}

export function findOption(groupId: string, optionId: string): MacroOption | undefined {
  return findGroup(groupId)?.options.find((option) => option.id === optionId);
}
