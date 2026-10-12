import { isEnumField } from '../../protocol/RolandAddressMap';
import type { EnumField, FieldReference } from '../../protocol/RolandAddressMap';
import type { GkMode } from './editor';
import { TEMPORARY_PATCH } from './patchLayout';

const modeling = TEMPORARY_PATCH.modelingTone;

export interface ModelingTonePick {
  category: string;
  tone: string;
  /** Display: "E.GTR · CLA-ST". */
  label: string;
}

interface CategorySlot {
  category: string;
  categoryField: FieldReference<EnumField>;
  numberField: FieldReference<EnumField>;
}

function enumLabels(field: FieldReference): string[] {
  const type = field.definition.type;
  if (!isEnumField(type)) return [];
  return Object.keys(type.labels)
    .map(Number)
    .sort((a, b) => a - b)
    .map((encoded) => String(type.labels[encoded]));
}

/** Category → tone-number field for the active GK mode. */
function slotsOf(mode: GkMode): CategorySlot[] {
  if (mode === 'BASS') {
    return [
      {
        category: 'E.BASS',
        categoryField: modeling.toneCategory_bass as FieldReference<EnumField>,
        numberField: modeling.toneNumberEBass_bass as FieldReference<EnumField>,
      },
      {
        category: 'SYNTH',
        categoryField: modeling.toneCategory_bass as FieldReference<EnumField>,
        numberField: modeling.toneNumberSynth_bass as FieldReference<EnumField>,
      },
      {
        category: 'E.GTR',
        categoryField: modeling.toneCategory_bass as FieldReference<EnumField>,
        numberField: modeling.toneNumberEGtr_bass as FieldReference<EnumField>,
      },
    ];
  }
  return [
    {
      category: 'E.GTR',
      categoryField: modeling.toneCategory_guitar as FieldReference<EnumField>,
      numberField: modeling.toneNumberEGtr_guitar as FieldReference<EnumField>,
    },
    {
      category: 'AC',
      categoryField: modeling.toneCategory_guitar as FieldReference<EnumField>,
      numberField: modeling.toneNumberAc_guitar as FieldReference<EnumField>,
    },
    {
      category: 'E.BASS',
      categoryField: modeling.toneCategory_guitar as FieldReference<EnumField>,
      numberField: modeling.toneNumberEBass_guitar as FieldReference<EnumField>,
    },
    {
      category: 'SYNTH',
      categoryField: modeling.toneCategory_guitar as FieldReference<EnumField>,
      numberField: modeling.toneNumberSynth_guitar as FieldReference<EnumField>,
    },
  ];
}

export function modelingToneCatalog(mode: GkMode): ModelingTonePick[] {
  const picks: ModelingTonePick[] = [];
  for (const slot of slotsOf(mode)) {
    for (const tone of enumLabels(slot.numberField)) {
      picks.push({
        category: slot.category,
        tone,
        label: `${slot.category} · ${tone}`,
      });
    }
  }
  return picks;
}

export function modelingToneFields(mode: GkMode, category: string): CategorySlot | undefined {
  return slotsOf(mode).find((slot) => slot.category === category);
}

/** Current modeling tone display label, or undefined if unread. */
export function readModelingToneLabel(
  mode: GkMode,
  read: (field: FieldReference) => unknown,
): string | undefined {
  const slots = slotsOf(mode);
  const categoryField = slots[0]?.categoryField;
  if (!categoryField) return undefined;
  const category = read(categoryField);
  if (typeof category !== 'string') return undefined;
  const slot = slots.find((item) => item.category === category);
  if (!slot) return String(category);
  const tone = read(slot.numberField);
  if (typeof tone !== 'string') return category;
  return `${category} · ${tone}`;
}
