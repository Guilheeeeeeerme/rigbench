import {
  AsciiStringField,
  isBooleanField,
  isEnumField,
  isNumericField,
} from '../protocol/RolandAddressMap';
import type { FieldReference, FieldType } from '../protocol/RolandAddressMap';
import type { GkMode } from '../devices/gr55/editor';
import { buildPages, isField, memberOf } from '../devices/gr55/pages';
import { TEMPORARY_PATCH_ADDRESS } from '../devices/gr55/patchLayout';

export type FieldKind = 'numeric' | 'boolean' | 'enum' | 'string' | 'other';

export interface RegistryEntry {
  /** Locale-free dotted key: `${pageId}/${sectionSlug}/${fieldKey}`. */
  key: string;
  pageId: string;
  sectionSlug: string;
  fieldKey: string;
  /** Pedal English description from the address map. */
  label: string;
  ref: FieldReference;
  kind: FieldKind;
  /** Enum labels in encoded order. */
  labels?: string[];
  min?: number;
  max?: number;
  essential: boolean;
  readOnly: boolean;
  /** Assigns page: readable, not writable in v1. */
  complex: boolean;
}

function kindOf(type: FieldType<unknown>): FieldKind {
  if (isNumericField(type)) return 'numeric';
  if (isBooleanField(type)) return 'boolean';
  if (isEnumField(type)) return 'enum';
  if (type instanceof AsciiStringField) return 'string';
  return 'other';
}

function enumLabels(type: FieldType<unknown>): string[] | undefined {
  if (!isEnumField(type)) return undefined;
  return Object.keys(type.labels)
    .map(Number)
    .sort((a, b) => a - b)
    .map((encoded) => String(type.labels[encoded]));
}

/**
 * Curated temporary-patch fields the model may name. System domain is absent by
 * construction (pages only cover TEMPORARY_PATCH). Deduped by address, first wins.
 */
export function buildFieldRegistry(mode: GkMode): RegistryEntry[] {
  const byAddress = new Map<number, RegistryEntry>();

  for (const page of buildPages(mode)) {
    for (const section of page.sections) {
      const essential = new Set(section.essentialKeys ?? []);
      const readOnly = new Set(section.readOnlyKeys ?? []);
      for (const fieldKey of section.keys) {
        const atom = memberOf(section.struct, fieldKey);
        if (!isField(atom)) continue;
        if (byAddress.has(atom.address)) continue;

        const type = atom.definition.type;
        const kind = kindOf(type);
        const entry: RegistryEntry = {
          key: `${page.id}/${section.slug}/${fieldKey}`,
          pageId: page.id,
          sectionSlug: section.slug,
          fieldKey,
          label: atom.definition.description,
          ref: atom,
          kind,
          labels: enumLabels(type),
          min: isNumericField(type) ? type.min : undefined,
          max: isNumericField(type) ? type.max : undefined,
          essential: essential.has(fieldKey),
          readOnly: readOnly.has(fieldKey),
          complex: page.id === 'assigns',
        };

        if (entry.ref.address < TEMPORARY_PATCH_ADDRESS) {
          throw new Error(`registry leaked system address for ${entry.key}`);
        }
        byAddress.set(atom.address, entry);
      }
    }
  }

  return [...byAddress.values()];
}

export function registryIndex(entries: readonly RegistryEntry[]): Map<string, RegistryEntry> {
  return new Map(entries.map((entry) => [entry.key, entry]));
}
