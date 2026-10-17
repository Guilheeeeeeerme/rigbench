import type { Gr55System } from './systemState';
import { gkSet, SYSTEM } from './systemMap';
import {
  gkWritesForProfile,
  type CalibrationSubProfileId,
  type InstrumentProfile,
  type OutputDestination,
} from './instrumentProfiles';

export function applyInstrumentProfile(
  system: Gr55System,
  profile: InstrumentProfile,
  options?: {
    puTypeOverride?: string;
    name?: string;
    calibrationId?: CalibrationSubProfileId;
  },
): { wrote: number; setNumber: number } {
  const select = system.read(SYSTEM.common.gkSetSelect);
  const setNumber = select.ok ? select.value + 1 : 1;
  const set = gkSet(setNumber);
  let wrote = 0;
  const name = options?.name ?? profile.gkSetName;
  if (name) {
    system.write(set.name, name.slice(0, 8));
    wrote++;
  }
  for (const write of gkWritesForProfile(
    profile,
    options?.puTypeOverride,
    options?.calibrationId,
  )) {
    const field = set[write.field];
    if (typeof field === 'number') {
      continue;
    }
    system.write(field as never, write.value as never);
    wrote++;
  }
  return { wrote, setNumber };
}

export function applyOutputDestination(system: Gr55System, dest: OutputDestination): void {
  system.write(SYSTEM.common.outputSelect, dest.outputSelect);
}
