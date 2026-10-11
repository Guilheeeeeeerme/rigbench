import type { MacroOption, PatchWrite } from './types';

/** Mute semantics: inverted mute fields — `true` = MUTE, `false` = sounding. */
const MUTE = true;
const SOUND = false;

const p = (key: string, value: unknown): PatchWrite => ({ domain: 'patch', key, value });

/** Curated PCM tones for Studio — labels match `pcmToneSelectField` enum strings. */
export interface PcmToneChoice {
  id: string;
  /** Exact GR-55 toneSelect label. */
  toneSelect: string;
  labelEn: string;
  labelPt: string;
}

export interface PcmToneCategory {
  id: string;
  labelEn: string;
  labelPt: string;
  tones: readonly PcmToneChoice[];
}

/**
 * Musician-friendly PCM families (accordion/sanfona, harmonica/gaita, sax, …).
 * Representative tones only — full ROM stays in Advanced.
 */
export const PCM_TONE_CATEGORIES: readonly PcmToneCategory[] = [
  {
    id: 'accordion',
    labelEn: 'Accordion',
    labelPt: 'Sanfona',
    tones: [
      {
        id: 'accordion-fr',
        toneSelect: 'Accordion Fr',
        labelEn: 'French accordion',
        labelPt: 'Sanfona francesa',
      },
      {
        id: 'accordion-it',
        toneSelect: 'Accordion It',
        labelEn: 'Italian accordion',
        labelPt: 'Sanfona italiana',
      },
      {
        id: 'accordion-it2',
        toneSelect: 'AccordionIt2',
        labelEn: 'Accordion It 2',
        labelPt: 'Sanfona It 2',
      },
      {
        id: 'musette',
        toneSelect: 'Musette',
        labelEn: 'Musette',
        labelPt: 'Musette',
      },
      {
        id: 'bandoneon',
        toneSelect: 'Bandoneon',
        labelEn: 'Bandoneon',
        labelPt: 'Bandoneón',
      },
    ],
  },
  {
    id: 'harmonica',
    labelEn: 'Harmonica',
    labelPt: 'Gaita',
    tones: [
      {
        id: 'harmonica-1',
        toneSelect: 'Harmonica 1',
        labelEn: 'Harmonica 1',
        labelPt: 'Gaita 1',
      },
      {
        id: 'harmonica-2',
        toneSelect: 'Harmonica 2',
        labelEn: 'Harmonica 2',
        labelPt: 'Gaita 2',
      },
    ],
  },
  {
    id: 'sax',
    labelEn: 'Sax',
    labelPt: 'Sax',
    tones: [
      {
        id: 'alto-sax',
        toneSelect: 'Alto Sax',
        labelEn: 'Alto sax',
        labelPt: 'Sax alto',
      },
      {
        id: 'tenor-sax-1',
        toneSelect: 'Tenor Sax 1',
        labelEn: 'Tenor sax 1',
        labelPt: 'Sax tenor 1',
      },
      {
        id: 'tenor-sax-2',
        toneSelect: 'Tenor Sax 2',
        labelEn: 'Tenor sax 2',
        labelPt: 'Sax tenor 2',
      },
      {
        id: 'soprano-sax-1',
        toneSelect: 'Soprano Sax1',
        labelEn: 'Soprano sax',
        labelPt: 'Sax soprano',
      },
      {
        id: 'baritone-sax',
        toneSelect: 'Baritone Sax',
        labelEn: 'Baritone sax',
        labelPt: 'Sax barítono',
      },
      {
        id: 'breathy-tenor',
        toneSelect: 'BreathyTenor',
        labelEn: 'Breathy tenor',
        labelPt: 'Tenor suave',
      },
    ],
  },
  {
    id: 'flute',
    labelEn: 'Flute',
    labelPt: 'Flauta',
    tones: [
      {
        id: 'flute-1',
        toneSelect: 'Flute 1',
        labelEn: 'Flute 1',
        labelPt: 'Flauta 1',
      },
      {
        id: 'pan-flute-1',
        toneSelect: 'Pan Flute 1',
        labelEn: 'Pan flute',
        labelPt: 'Flauta de pã',
      },
      {
        id: 'shakuhachi-1',
        toneSelect: 'Shakuhachi 1',
        labelEn: 'Shakuhachi',
        labelPt: 'Shakuhachi',
      },
    ],
  },
  {
    id: 'brass',
    labelEn: 'Brass',
    labelPt: 'Metais',
    tones: [
      {
        id: 'trumpet',
        toneSelect: 'Trumpet 1',
        labelEn: 'Trumpet',
        labelPt: 'Trompete',
      },
      {
        id: 'trombone',
        toneSelect: 'Trombone 1',
        labelEn: 'Trombone',
        labelPt: 'Trombone',
      },
      {
        id: 'muted-trumpet',
        toneSelect: 'MuteTrumpet1',
        labelEn: 'Muted trumpet',
        labelPt: 'Trompete com surdina',
      },
    ],
  },
  {
    id: 'piano',
    labelEn: 'Piano',
    labelPt: 'Piano',
    tones: [
      {
        id: 'st-piano-1',
        toneSelect: 'St.Piano 1',
        labelEn: 'Stereo piano',
        labelPt: 'Piano estéreo',
      },
      {
        id: 'stage-piano',
        toneSelect: 'Stage Piano',
        labelEn: 'Stage piano',
        labelPt: 'Piano de palco',
      },
      {
        id: 'ep-legend-1',
        toneSelect: 'EP Legend 1',
        labelEn: 'EP legend',
        labelPt: 'EP clássico',
      },
    ],
  },
  {
    id: 'organ',
    labelEn: 'Organ',
    labelPt: 'Órgão',
    tones: [
      {
        id: 'rock-organ-1',
        toneSelect: 'Rock Organ 1',
        labelEn: 'Rock organ',
        labelPt: 'Órgão rock',
      },
      {
        id: 'church-org-1',
        toneSelect: 'Church Org 1',
        labelEn: 'Church organ',
        labelPt: 'Órgão de igreja',
      },
      {
        id: 'rotary-organ-1',
        toneSelect: 'RotaryOrgan1',
        labelEn: 'Rotary organ',
        labelPt: 'Órgão rotativo',
      },
    ],
  },
  {
    id: 'choir',
    labelEn: 'Choir / pad',
    labelPt: 'Coro / pad',
    tones: [
      {
        id: 'choir-pad',
        toneSelect: 'Choir Pad',
        labelEn: 'Choir pad',
        labelPt: 'Pad de coro',
      },
      {
        id: 'angels-choir',
        toneSelect: 'Angels Choir',
        labelEn: 'Angels choir',
        labelPt: 'Coro celestial',
      },
      {
        id: 'vox-pad-1',
        toneSelect: 'Vox Pad 1',
        labelEn: 'Vox pad',
        labelPt: 'Pad de voz',
      },
    ],
  },
];

function pcm1ToneWrites(toneSelect: string): readonly PatchWrite[] {
  return [
    p('pcm1/tone/toneSelect', toneSelect),
    p('pcm1/tone/muteSwitch', SOUND),
    p('pcm1/tone/partLevel', 85),
    p('pcm1/tone/partPan', 50),
    p('pcm2/tone/muteSwitch', MUTE),
    p('pcm2/tone/partLevel', 20),
  ];
}

/** Flat macro options for Synth voice (Off + curated tones). */
export function synthVoiceOptions(): MacroOption[] {
  const off: MacroOption = {
    id: 'off',
    labelEn: 'Off',
    labelPt: 'Desligado',
    writes: [p('pcm1/tone/muteSwitch', MUTE), p('pcm2/tone/muteSwitch', MUTE)],
  };
  const tones = PCM_TONE_CATEGORIES.flatMap((category) =>
    category.tones.map((tone): MacroOption => ({
      id: tone.id,
      labelEn: tone.labelEn,
      labelPt: tone.labelPt,
      writes: pcm1ToneWrites(tone.toneSelect),
    })),
  );
  return [off, ...tones];
}

export function categoryForToneOption(optionId: string): string | undefined {
  if (optionId === 'off') return 'off';
  for (const category of PCM_TONE_CATEGORIES) {
    if (category.tones.some((tone) => tone.id === optionId)) return category.id;
  }
  return undefined;
}
