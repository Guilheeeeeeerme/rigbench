import type { Gr55System } from '../systemState';
import { SYSTEM } from '../systemMap';
import { ctlAction, expAction, expSwAction } from './ctlExp';
import type { MusicalPreset } from './catalog';

export interface CtlExpApplyResult {
  ok: true;
  wrote: number;
  warnedPatchSetting: boolean;
  impactEn: string;
  impactPt: string;
}

/**
 * SYSTEM gate only: move CTL / EXP / EXP SW to PATCH SETTING when the preset needs it.
 *
 * Does **not** write GK SENS, PU TYPE, or any other GK/system instrument fields.
 * Patch-layer CTL/EXP functions and ASSIGN wipe live in `applyPresetToTemp`.
 * Full ASSIGN target programming is not done here (remaining gap).
 */
export function applyCtlExpForPreset(
  system: Gr55System,
  preset: MusicalPreset,
): CtlExpApplyResult {
  let wrote = 0;
  let warnedPatchSetting = false;

  const ensurePatchSetting = (
    field: typeof SYSTEM.pedals.ctlFunction,
    currentNeeds: boolean,
  ) => {
    if (!currentNeeds) return;
    const read = system.read(field);
    if (read.ok && read.value !== 'PATCH SETTING') {
      warnedPatchSetting = true;
    }
    system.write(field, 'PATCH SETTING');
    wrote++;
  };

  const ctl = ctlAction(preset.ctlExp.ctl);
  const exp = expAction(preset.ctlExp.exp);
  const expSw = expSwAction(preset.ctlExp.expSw);

  ensurePatchSetting(SYSTEM.pedals.ctlFunction, Boolean(ctl?.requiresPatchSetting));
  ensurePatchSetting(SYSTEM.pedals.expOffFunction, Boolean(exp?.requiresPatchSetting));
  ensurePatchSetting(SYSTEM.pedals.expSwFunction, Boolean(expSw?.requiresPatchSetting));

  // When PATCH SETTING is set, patch MASTER owns the musical function.
  // For MVP we still park SYSTEM on PATCH SETTING so patch-layer controls apply.
  // Optional: map continuous EXP to a SYSTEM function when not deferring — skipped.

  return {
    ok: true,
    wrote,
    warnedPatchSetting,
    impactEn: warnedPatchSetting
      ? 'Pedal functions moved to PATCH SETTING (affects how CTL/EXP behave on every patch until changed).'
      : 'CTL/EXP already follow each patch (PATCH SETTING).',
    impactPt: warnedPatchSetting
      ? 'Funções dos pedais foram para PATCH SETTING (afeta CTL/EXP em todos os patches até mudar).'
      : 'CTL/EXP já seguem cada patch (PATCH SETTING).',
  };
}
