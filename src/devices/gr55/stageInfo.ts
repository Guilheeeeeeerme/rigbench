import type { Gr55Editor } from './editor';
import type { EnumField, FieldReference } from '../../protocol/RolandAddressMap';
import { TEMPORARY_PATCH } from './patchLayout';

const patch = TEMPORARY_PATCH;

/** The type field that names a power block's sound, when it has one. */
const TYPE_FIELDS = new Map<number, FieldReference<EnumField>>([
  [patch.ampModNs.ampSwitch.address, patch.ampModNs.ampType as FieldReference<EnumField>],
  [patch.ampModNs.modSwitch.address, patch.ampModNs.modType as FieldReference<EnumField>],
  [patch.mfx.mfxSwitch.address, patch.mfx.mfxType as FieldReference<EnumField>],
  [patch.sendsAndEq.chorusSwitch.address, patch.sendsAndEq.chorusType as FieldReference<EnumField>],
  [patch.sendsAndEq.delaySwitch.address, patch.sendsAndEq.delayType as FieldReference<EnumField>],
  [patch.sendsAndEq.reverbSwitch.address, patch.sendsAndEq.reverbType as FieldReference<EnumField>],
]);

/** The name of the effect now loaded in a block, e.g. "AM Drive" for MFX. */
export function effectChoice(editor: Gr55Editor, powerField: FieldReference): string | undefined {
  const type = TYPE_FIELDS.get(powerField.address);
  if (!type) {
    return undefined;
  }
  const result = editor.read(type);
  return result.ok ? String(result.value) : undefined;
}
