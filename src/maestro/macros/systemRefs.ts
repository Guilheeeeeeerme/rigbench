import { gkSet, SYSTEM } from '../../devices/gr55/systemMap';
import type { Gr55System } from '../../devices/gr55/systemState';
import type { FieldReference } from '../../protocol/RolandAddressMap';

function fieldAt(bag: object, name: string): FieldReference | undefined {
  const value = (bag as Record<string, unknown>)[name];
  if (value && typeof value === 'object' && 'address' in value && 'definition' in value) {
    return value as FieldReference;
  }
  return undefined;
}

/**
 * Resolves a macro system `ref` string to a field on the live system image.
 * Returns undefined when the active GK set cannot be read or the path is unknown.
 */
export function resolveSystemRef(system: Gr55System, ref: string): FieldReference | undefined {
  const parts = ref.split('.');
  if (parts[0] === 'common' && parts[1]) {
    return fieldAt(SYSTEM.common, parts[1]);
  }
  if (parts[0] === 'pedals' && parts[1]) {
    return fieldAt(SYSTEM.pedals, parts[1]);
  }
  if (parts[0] === 'gkSet' && parts[1] && parts[2]) {
    let number: number;
    if (parts[1] === 'active') {
      const active = system.read(SYSTEM.common.gkSetSelect);
      number = active.ok ? active.value + 1 : 1;
    } else {
      number = Number(parts[1]);
    }
    if (!Number.isInteger(number) || number < 1 || number > 10) return undefined;
    return fieldAt(gkSet(number), parts[2]);
  }
  return undefined;
}
