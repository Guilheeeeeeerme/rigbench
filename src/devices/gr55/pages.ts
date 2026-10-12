import { t as currentT } from '../../copy';
import type { Translate } from '../../copy';
import { FieldDefinition, ReservedField, isEnumField } from '../../protocol/RolandAddressMap';
import type {
  AtomReference,
  FieldReference,
  StructDefinition,
} from '../../protocol/RolandAddressMap';
import type { GkMode } from './editor';
import { TEMPORARY_PATCH } from './patchLayout';

export type StructReference = AtomReference<StructDefinition<Record<string, never>>>;

export interface Section {
  title: string;
  struct: StructReference;
  /** Field keys of the struct shown in this section, in map order. */
  keys: readonly string[];
  /** Stable URL piece: /gr55/editor/:page/:section. */
  slug: string;
  /**
   * The few parameters of this section most patches actually need. They are always
   * shown; the Advanced switch adds the rest.
   */
  essentialKeys?: readonly string[];
  /**
   * Key of the enum that picks the active effect. Fields named after another effect of
   * that enum are hidden until that effect is selected.
   */
  typeKey?: string;
  readOnlyKeys?: readonly string[];
}

export interface Page {
  id: string;
  title: string;
  sections: readonly Section[];
}

/** Page ids double as URL slugs; they are frozen here so links cannot drift. */
export const PAGE_IDS = [
  'patch',
  'pcm1',
  'pcm2',
  'modeling',
  'normal-pickup',
  'amp',
  'mod',
  'mfx',
  'delay',
  'chorus',
  'reverb',
  'eq',
  'assigns',
  'pedal-gk',
  'master',
] as const;

export type PageId = (typeof PAGE_IDS)[number];

export function editorHref(pageId: PageId, sectionSlug: string): string {
  return `/gr55/editor/${pageId}/${sectionSlug}`;
}

export function memberOf(struct: StructReference, key: string): AtomReference {
  return (struct as unknown as Record<string, AtomReference>)[key];
}

export function isField(atom: AtomReference): atom is FieldReference {
  return atom.definition instanceof FieldDefinition;
}

function fieldKeys(struct: StructReference, filter: KeyFilter = () => true): string[] {
  return Object.keys(struct.definition.$).filter((key) => {
    const member = memberOf(struct, key);
    return isField(member) && !(member.definition.type instanceof ReservedField) && filter(key);
  });
}

/** A keys filter. Groups are curated lists; no prefix or leftover filters remain. */
type KeyFilter = (key: string) => boolean;

function section(
  title: string,
  struct: unknown,
  slug: string,
  filter?: KeyFilter,
  extra: Pick<Section, 'typeKey' | 'readOnlyKeys' | 'essentialKeys'> = {},
): Section {
  const reference = struct as StructReference;
  return {
    title,
    struct: reference,
    slug,
    keys: fieldKeys(reference, filter),
    ...extra,
  };
}

const oneOf =
  (...keys: string[]): KeyFilter =>
  (key) =>
    keys.includes(key);

// Modeling parameters exist once per GK mode; the key suffix says which.
const MODE_SUFFIX: Record<GkMode, string> = { GUITAR: '_guitar', BASS: '_bass' };
const forMode = (mode: GkMode): KeyFilter => {
  const other = MODE_SUFFIX[mode === 'GUITAR' ? 'BASS' : 'GUITAR'];
  return (key) => !key.endsWith(other);
};

const patch = TEMPORARY_PATCH;
const common = patch.common;

const isName = oneOf('patchName', 'patchAttribute');
const isNormalPickup = oneOf('normalPuMute', 'normalPuLevel', 'lineSelectNormalPU');
// Groups are curated key lists, never prefix matches: what a group holds is visible here.
const isAmp = oneOf(
  'ampSwitch',
  'ampType',
  'ampGain',
  'ampLevel',
  'ampGainSwitch',
  'ampSoloSwitch',
  'ampSoloLevel',
  'ampBass',
  'ampMiddle',
  'ampTreble',
  'ampPresence',
  'ampBright',
  'ampSpType',
  'ampMicType',
  'ampMicDistance',
  'ampMicPosition',
  'ampMicLevel',
);
const isNoiseSuppressor = oneOf('nsSwitch', 'nsThreshold', 'nsReleaseTime');
const isPedalControl = oneOf(
  'gkSet',
  'expPdlOffModControlMin',
  'expPdlOffModControlMax',
  'expPdlOnModControlMin',
  'expPdlOnModControlMax',
  'gkVolModControlMin',
  'gkVolModControlMax',
);
const isDelay = oneOf('delaySwitch', 'delayType', 'delayTime', 'delayFeedback', 'delayEffectLevel');
const isChorus = oneOf(
  'chorusSwitch',
  'chorusType',
  'chorusRate',
  'chorusDepth',
  'chorusEffectLevel',
);
const isReverb = oneOf(
  'reverbSwitch',
  'reverbType',
  'reverbTime',
  'reverbHighCut',
  'reverbEffectLevel',
);
const isEq = oneOf(
  'eqSwitch',
  'eqLowCutoffFreq',
  'eqLowGain',
  'eqLowMidCutoffFreq',
  'eqLowMidQ',
  'eqLowMidGain',
  'eqHighMidCutoffFreq',
  'eqHighMidQ',
  'eqHighMidGain',
  'eqHighCutoffFreq',
  'eqHighGain',
  'eqLevel',
);
const isOutput = oneOf(
  'guitarOutSource',
  'lineSelectModel',
  'effectStructure',
  'patchLevel',
  'patchTempo',
  'bypassChorusSendLevel',
  'bypassDelaySendLevel',
  'bypassReverbSendLevel',
);
const isTuning = oneOf(
  'altTuneSwitch',
  'altTuneType',
  'userTuneShiftString1',
  'userTuneShiftString2',
  'userTuneShiftString3',
  'userTuneShiftString4',
  'userTuneShiftString5',
  'userTuneShiftString6',
);
const isVLink = oneOf(
  'vlinkPalette',
  'vlinkPatchClip',
  'vlinkClipChange',
  'vlinkExpPedal',
  'vlinkExpPedalOn',
  'vlinkGkVol',
);
const isEz = oneOf('ezCharacter');
// The MOD block: everything the amp and the noise suppressor do not hold.
const isModFields = oneOf(
  'modSwitch',
  'modType',
  'modPan',
  'modChorusSendLevel',
  'modDelaySendLevel',
  'modReverbSendLevel',
  'odDsType',
  'odDsDrive',
  'odDsTone',
  'odDsLevel',
  'wahMode',
  'wahType',
  'wahPedalPosition',
  'wahSens',
  'wahFreq',
  'wahPeak',
  'wahLevel',
  'compSustain',
  'compAttack',
  'compLevel',
  'limiterThreshold',
  'limiterRelease',
  'limiterLevel',
  'octaveOctLevel',
  'octaveDryLevel',
  'phaserType',
  'phaserRate',
  'phaserDepth',
  'phaserResonance',
  'phaserLevel',
  'flangerRate',
  'flangerDepth',
  'flangerManual',
  'flangerResonance',
  'flangerLevel',
  'tremoloRate',
  'tremoloDepth',
  'tremoloWaveShape',
  'tremoloLevel',
  'rotaryRateSlow',
  'rotaryRateFast',
  'rotaryDepth',
  'rotarySelect',
  'rotaryLevel',
  'uniVRate',
  'uniVDepth',
  'uniVLevel',
  'panRate',
  'panDepth',
  'panWaveShape',
  'panLevel',
  'delayType',
  'delayTime',
  'delayFeedback',
  'delayEffectLevel',
  'chorusType',
  'chorusRate',
  'chorusDepth',
  'chorusEffectLevel',
  'eqLowCutoffFreq',
  'eqLowGain',
  'eqLowMidCutoffFreq',
  'eqLowMidQ',
  'eqLowMidGain',
  'eqHighMidCutoffFreq',
  'eqHighMidQ',
  'eqHighMidGain',
  'eqHighGain',
  'eqHighCutoffFreq',
  'eqLevel',
);

/**
 * The editor's pages. Each one is a slice of the address map; controls are generated
 * from the field definitions, so a parameter added to the map shows up here by itself.
 */
export function buildPages(mode: GkMode, t: Translate = currentT): Page[] {
  return [
    {
      id: 'patch',
      title: t('gr55.pages.patch'),
      sections: [
        section(t('gr55.pages.patch'), common, 'common', isName, {
          essentialKeys: ['patchName'],
          readOnlyKeys: ['patchAttribute'],
        }),
      ],
    },
    {
      id: 'pcm1',
      title: t('gr55.pages.pcm1'),
      sections: [
        section(t('gr55.pages.tone'), patch.patchPCMTone1, 'tone', undefined, {
          essentialKeys: ['toneSelect', 'muteSwitch', 'partLevel', 'partPan'],
        }),
        section(t('gr55.pages.toneOffsets'), patch.patchPCMTone1Offset, 'offsets'),
      ],
    },
    {
      id: 'pcm2',
      title: t('gr55.pages.pcm2'),
      sections: [
        section(t('gr55.pages.tone'), patch.patchPCMTone2, 'tone', undefined, {
          essentialKeys: ['toneSelect', 'muteSwitch', 'partLevel', 'partPan'],
        }),
        section(t('gr55.pages.toneOffsets'), patch.patchPCMTone2Offset, 'offsets'),
      ],
    },
    {
      id: 'modeling',
      title: t('gr55.pages.modeling'),
      sections: [
        section(t('gr55.pages.modeling'), patch.modelingTone, 'tone', forMode(mode), {
          essentialKeys: ['level', 'muteSwitch'],
        }),
      ],
    },
    {
      id: 'normal-pickup',
      title: t('gr55.pages.normalPickup'),
      sections: [
        section(t('gr55.pages.normalPickup'), common, 'level', isNormalPickup, {
          essentialKeys: ['normalPuLevel', 'normalPuMute'],
        }),
      ],
    },
    {
      id: 'amp',
      title: t('gr55.pages.amp'),
      sections: [
        section(t('gr55.pages.amp'), patch.ampModNs, 'amp', isAmp, {
          essentialKeys: ['ampSwitch', 'ampType', 'ampLevel', 'ampSoloLevel'],
        }),
        section(
          t('gr55.pages.noiseSuppressor'),
          patch.ampModNs,
          'noise-suppressor',
          isNoiseSuppressor,
        ),
      ],
    },
    {
      id: 'mod',
      title: t('gr55.pages.mod'),
      sections: [
        section(t('gr55.pages.mod'), patch.ampModNs, 'mod', isModFields, {
          typeKey: 'modType',
          essentialKeys: [
            'modSwitch',
            'modType',
            'modPan',
            'modChorusSendLevel',
            'modDelaySendLevel',
            'modReverbSendLevel',
          ],
        }),
      ],
    },
    {
      id: 'mfx',
      title: t('gr55.pages.mfx'),
      sections: [
        section(t('gr55.pages.mfx'), patch.mfx, 'mfx', undefined, {
          typeKey: 'mfxType',
          essentialKeys: [
            'mfxSwitch',
            'mfxType',
            'mfxPan',
            'mfxChorusSendLevel',
            'mfxDelaySendLevel',
            'mfxReverbSendLevel',
          ],
        }),
      ],
    },
    {
      id: 'delay',
      title: t('gr55.pages.delay'),
      sections: [
        section(t('gr55.pages.delay'), patch.sendsAndEq, 'delay', isDelay, {
          essentialKeys: ['delaySwitch', 'delayType', 'delayTime', 'delayEffectLevel'],
        }),
      ],
    },
    {
      id: 'chorus',
      title: t('gr55.pages.chorus'),
      sections: [
        section(t('gr55.pages.chorus'), patch.sendsAndEq, 'chorus', isChorus, {
          essentialKeys: ['chorusSwitch', 'chorusType', 'chorusDepth', 'chorusEffectLevel'],
        }),
      ],
    },
    {
      id: 'reverb',
      title: t('gr55.pages.reverb'),
      sections: [
        section(t('gr55.pages.reverb'), patch.sendsAndEq, 'reverb', isReverb, {
          essentialKeys: ['reverbSwitch', 'reverbType', 'reverbTime', 'reverbEffectLevel'],
        }),
      ],
    },
    {
      id: 'eq',
      title: t('gr55.pages.eq'),
      sections: [
        section(t('gr55.pages.eq'), patch.sendsAndEq, 'eq', isEq, {
          essentialKeys: ['eqSwitch', 'eqLevel'],
        }),
      ],
    },
    {
      id: 'assigns',
      title: t('gr55.pages.assigns'),
      sections: [
        common.assign1,
        common.assign2,
        common.assign3,
        common.assign4,
        common.assign5,
        common.assign6,
        common.assign7,
        common.assign8,
      ].map((assign, index) =>
        section(assign.definition.description, assign, `assign-${index + 1}`, undefined, {
          essentialKeys: ['switch', 'target', 'source'],
        }),
      ),
    },
    {
      id: 'pedal-gk',
      title: t('gr55.pages.pedalGk'),
      sections: [
        ...(
          [
            [
              common.ctl,
              'ctl',
              [
                'status',
                'function',
                'holdSwitchMode',
                'offPcmTone1Switch',
                'offPcmTone2Switch',
                'offModelingToneSwitch',
                'offNormalPuSwitch',
                'onPcmTone1Switch',
                'onPcmTone2Switch',
                'onModelingToneSwitch',
                'onNormalPuSwitch',
              ] as const,
            ],
            [
              common.expPdlOff,
              'exp-off',
              [
                'function',
                'volumeSwitchPCMTone1',
                'volumeSwitchPCMTone2',
                'volumeSwitchModelingTone',
                'volumeSwitchNormalPU',
                'bendRange',
              ] as const,
            ],
            [
              common.expPdlOn,
              'exp-on',
              [
                'function',
                'volumeSwitchPCMTone1',
                'volumeSwitchPCMTone2',
                'volumeSwitchModelingTone',
                'volumeSwitchNormalPU',
                'bendRange',
              ] as const,
            ],
            [common.expSw, 'exp-switch', ['status', 'function'] as const],
            [
              common.gkVol,
              'gk-volume',
              [
                'function',
                'volumeSwitchPCMTone1',
                'volumeSwitchPCMTone2',
                'volumeSwitchModelingTone',
                'volumeSwitchNormalPU',
              ] as const,
            ],
            [common.gkS1, 'gk-s1', ['function'] as const],
            [common.gkS2, 'gk-s2', ['function'] as const],
          ] as const
        ).map(([control, slug, essentials]) =>
          section(control.definition.description, control, slug, undefined, {
            essentialKeys: essentials,
          }),
        ),
        section(t('gr55.pages.pedalRanges'), common, 'ranges', isPedalControl, {
          essentialKeys: ['gkSet'],
        }),
      ],
    },
    {
      id: 'master',
      title: t('gr55.pages.master'),
      sections: [
        section(t('gr55.pages.output'), common, 'output', isOutput, {
          essentialKeys: ['guitarOutSource', 'effectStructure', 'patchLevel'],
        }),
        section(t('gr55.pages.tuning'), common, 'tuning', isTuning, {
          essentialKeys: ['altTuneSwitch', 'altTuneType'],
        }),
        section(t('gr55.pages.vlink'), common, 'vlink', isVLink),
        section(t('gr55.pages.ez'), patch.sendsAndEq, 'ez', isEz),
      ],
    },
  ];
}

function normalize(text: string): string {
  return text.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Effect names whose parameters the map describes under a shorter name.
const EFFECT_DESCRIPTION_PREFIX: Record<string, string> = {
  'GUITAR AMP SIM': 'GTR AMP SIM',
  '3TAP PAN DELAY': '3TAP DELAY',
};

/**
 * For a section with a typeKey: which effect each field belongs to, by matching the
 * start of the field's description against the effect names of the type enum.
 * Fields that belong to no effect (switch, type, sends) map to undefined and always show.
 */
export function effectOfFields(target: Section): Map<string, string | undefined> {
  const result = new Map<string, string | undefined>();
  const typeField = target.typeKey && memberOf(target.struct, target.typeKey);
  const type = typeField && isField(typeField) ? typeField.definition.type : undefined;
  const labels = type && isEnumField(type) ? Object.values(type.labels).map(String) : [];
  for (const key of target.keys) {
    const description = normalize(memberOf(target.struct, key).definition.description);
    let match: string | undefined;
    for (const label of labels) {
      const prefix = normalize(EFFECT_DESCRIPTION_PREFIX[label] ?? label);
      if (description.startsWith(prefix) && (!match || label.length > match.length)) {
        match = label;
      }
    }
    result.set(key, key === target.typeKey ? undefined : match);
  }
  return result;
}
