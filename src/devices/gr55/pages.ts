import { en } from '../../copy/en';
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

type KeyFilter = (key: string) => boolean;

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

function section(
  title: string,
  struct: unknown,
  filter?: KeyFilter,
  extra: Pick<Section, 'typeKey' | 'readOnlyKeys'> = {},
): Section {
  const reference = struct as StructReference;
  return { title, struct: reference, keys: fieldKeys(reference, filter), ...extra };
}

const startsWith =
  (...prefixes: string[]): KeyFilter =>
  (key) =>
    prefixes.some((prefix) => key.startsWith(prefix));

const oneOf =
  (...keys: string[]): KeyFilter =>
  (key) =>
    keys.includes(key);

const not =
  (...filters: KeyFilter[]): KeyFilter =>
  (key) =>
    !filters.some((filter) => filter(key));

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
const isPedalControl = (key: string) => key === 'gkSet' || key.includes('ModControl');
const isAmp = startsWith('amp');
const isNoiseSuppressor = startsWith('ns');

/**
 * The editor's pages. Each one is a slice of the address map; controls are generated
 * from the field definitions, so a parameter added to the map shows up here by itself.
 */
export function buildPages(mode: GkMode): Page[] {
  const t = en.gr55.pages;
  return [
    {
      id: 'patch',
      title: t.patch,
      sections: [section(t.patch, common, isName, { readOnlyKeys: ['patchAttribute'] })],
    },
    {
      id: 'pcm1',
      title: t.pcm1,
      sections: [
        section(t.tone, patch.patchPCMTone1),
        section(t.toneOffsets, patch.patchPCMTone1Offset),
      ],
    },
    {
      id: 'pcm2',
      title: t.pcm2,
      sections: [
        section(t.tone, patch.patchPCMTone2),
        section(t.toneOffsets, patch.patchPCMTone2Offset),
      ],
    },
    {
      id: 'modeling',
      title: t.modeling,
      sections: [section(t.modeling, patch.modelingTone, forMode(mode))],
    },
    {
      id: 'normal-pickup',
      title: t.normalPickup,
      sections: [section(t.normalPickup, common, isNormalPickup)],
    },
    {
      id: 'amp',
      title: t.amp,
      sections: [
        section(t.amp, patch.ampModNs, isAmp),
        section(t.noiseSuppressor, patch.ampModNs, isNoiseSuppressor),
      ],
    },
    {
      id: 'mod',
      title: t.mod,
      sections: [
        section(t.mod, patch.ampModNs, not(isAmp, isNoiseSuppressor), { typeKey: 'modType' }),
      ],
    },
    {
      id: 'mfx',
      title: t.mfx,
      sections: [section(t.mfx, patch.mfx, undefined, { typeKey: 'mfxType' })],
    },
    {
      id: 'delay',
      title: t.delay,
      sections: [section(t.delay, patch.sendsAndEq, startsWith('delay'))],
    },
    {
      id: 'chorus',
      title: t.chorus,
      sections: [section(t.chorus, patch.sendsAndEq, startsWith('chorus'))],
    },
    {
      id: 'reverb',
      title: t.reverb,
      sections: [section(t.reverb, patch.sendsAndEq, startsWith('reverb'))],
    },
    {
      id: 'eq',
      title: t.eq,
      sections: [section(t.eq, patch.sendsAndEq, startsWith('eq'))],
    },
    {
      id: 'assigns',
      title: t.assigns,
      sections: [
        common.assign1,
        common.assign2,
        common.assign3,
        common.assign4,
        common.assign5,
        common.assign6,
        common.assign7,
        common.assign8,
      ].map((assign) => section(assign.definition.description, assign)),
    },
    {
      id: 'pedal-gk',
      title: t.pedalGk,
      sections: [
        ...[
          common.ctl,
          common.expPdlOff,
          common.expPdlOn,
          common.expSw,
          common.gkVol,
          common.gkS1,
          common.gkS2,
        ].map((control) => section(control.definition.description, control)),
        section(t.pedalRanges, common, isPedalControl),
      ],
    },
    {
      id: 'master',
      title: t.master,
      sections: [
        section(t.master, common, not(isName, isNormalPickup, isPedalControl)),
        section(t.other, patch.sendsAndEq, not(startsWith('delay', 'chorus', 'reverb', 'eq'))),
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
