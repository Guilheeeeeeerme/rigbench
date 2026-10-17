import type { Gr55Editor } from '../editor';
import { modelingToneFields } from '../modelingTones';
import { TEMPORARY_PATCH } from '../patchLayout';
import type { MusicalPreset, PresetChain } from './catalog';
import { ctlAction, expAction, expSwAction } from './ctlExp';

export interface ApplyPresetResult {
  ok: true;
  wrote: number;
  scopes: readonly string[];
  impactEn: string;
  impactPt: string;
}

export interface PitchOptions {
  /** Semitone shift (−24…+24). Session default 0. */
  pitchShift?: number;
  /**
   * Explicit chromatic override from Shape.
   * `undefined` = follow preset profile recommendation.
   */
  chromatic?: boolean;
}

type LineRoute = 'BYPS' | 'AMP' | 'MFX';

const PITCH_MIN = -24;
const PITCH_MAX = 24;

export function clampPitchShift(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(PITCH_MIN, Math.min(PITCH_MAX, Math.trunc(value)));
}

function chainOf(preset: MusicalPreset): PresetChain {
  if (preset.chain) return preset.chain;
  const usesModeling = Boolean(preset.modelingOn);
  return {
    pcm1Route: 'BYPS',
    pcm2Route: 'BYPS',
    modelingRoute: usesModeling ? 'AMP' : 'BYPS',
    normalRoute: 'BYPS',
    ampOn: Boolean(preset.ampOn),
    ampType: preset.ampType ?? (usesModeling ? 'BOSS CLEAN' : 'FULL RANGE'),
    ampGain: usesModeling ? 40 : 20,
    ampLevel: 80,
    modOn: Boolean(preset.modOn),
    modType: preset.modType,
    mfxOn: false,
    chorusOn: false,
    delayOn: false,
    reverbOn: !usesModeling,
    eqOn: false,
  };
}

/**
 * Write pitch shift + chromatic onto the temporary patch.
 * Pitch shift always comes from the session (default 0).
 * Chromatic is the resolved value (override ?? profile).
 */
export function applyPitchToTemp(editor: Gr55Editor, options: PitchOptions = {}): number {
  const patch = TEMPORARY_PATCH;
  const pitch = clampPitchShift(options.pitchShift ?? 0);
  const chromatic = options.chromatic === true;
  let wrote = 0;
  const write = (field: Parameters<Gr55Editor['write']>[0], value: unknown) => {
    editor.write(field as never, value as never);
    wrote++;
  };

  write(patch.patchPCMTone1.partCoarseTune, pitch);
  write(patch.patchPCMTone1.partFineTune, 0);
  write(patch.patchPCMTone1.partOctaveShift, 0);
  write(patch.patchPCMTone1.chromatic, chromatic);
  if (!chromatic) write(patch.patchPCMTone1.legatoSwitch, false);

  write(patch.patchPCMTone2.partCoarseTune, pitch);
  write(patch.patchPCMTone2.partFineTune, 0);
  write(patch.patchPCMTone2.partOctaveShift, 0);
  write(patch.patchPCMTone2.chromatic, chromatic);
  if (!chromatic) write(patch.patchPCMTone2.legatoSwitch, false);

  write(patch.modelingTone.pitchShiftString1, pitch);
  write(patch.modelingTone.pitchShiftFineString1, 0);
  for (const field of [
    patch.modelingTone.pitchShiftString2,
    patch.modelingTone.pitchShiftString3,
    patch.modelingTone.pitchShiftString4,
    patch.modelingTone.pitchShiftString5,
    patch.modelingTone.pitchShiftString6,
  ] as const) {
    write(field, 0);
  }
  for (const field of [
    patch.modelingTone.pitchShiftFineString2,
    patch.modelingTone.pitchShiftFineString3,
    patch.modelingTone.pitchShiftFineString4,
    patch.modelingTone.pitchShiftFineString5,
    patch.modelingTone.pitchShiftFineString6,
  ] as const) {
    write(field, 0);
  }

  return wrote;
}

/**
 * Full temporary-patch takeover for a musical preset.
 * Pitch shift comes from session options (never forced by catalog).
 * Chromatic: options.chromatic if set, else preset profile recommendation.
 *
 * Scope: temporary patch only. Never writes SYSTEM / GK (SENS, PU TYPE, …).
 * CTL/EXP PATCH SETTING gate is a separate SYSTEM write in `applyCtlExpForPreset`.
 */
export function applyPresetToTemp(
  editor: Gr55Editor,
  preset: MusicalPreset,
  pitch: PitchOptions = {},
): ApplyPresetResult {
  const patch = TEMPORARY_PATCH;
  const chain = chainOf(preset);
  let wrote = 0;

  const write = (field: Parameters<Gr55Editor['write']>[0], value: unknown) => {
    editor.write(field as never, value as never);
    wrote++;
  };

  const MUTE = true;
  const SOUND = false;

  write(patch.patchPCMTone1.muteSwitch, MUTE);
  write(patch.patchPCMTone2.muteSwitch, MUTE);
  write(patch.modelingTone.muteSwitch, MUTE);
  write(patch.common.normalPuMute, MUTE);
  write(patch.common.normalPuLevel, 0);

  write(patch.ampModNs.ampSwitch, false);
  write(patch.ampModNs.modSwitch, false);
  write(patch.mfx.mfxSwitch, false);
  write(patch.sendsAndEq.chorusSwitch, false);
  write(patch.sendsAndEq.delaySwitch, false);
  write(patch.sendsAndEq.reverbSwitch, false);
  write(patch.sendsAndEq.eqSwitch, false);

  // Clear leftover ASSIGN slots so prior patches cannot hijack CTL/EXP.
  for (const assign of [
    patch.common.assign1,
    patch.common.assign2,
    patch.common.assign3,
    patch.common.assign4,
    patch.common.assign5,
    patch.common.assign6,
    patch.common.assign7,
    patch.common.assign8,
  ] as const) {
    write(assign.switch, false);
  }

  write(patch.patchPCMTone1.partOutputMFXSelect, 'BYPS' satisfies LineRoute);
  write(patch.patchPCMTone2.partOutputMFXSelect, 'BYPS' satisfies LineRoute);
  write(patch.common.lineSelectModel, 'BYPS' satisfies LineRoute);
  write(patch.common.lineSelectNormalPU, 'BYPS' satisfies LineRoute);

  const pcm1On = preset.pcm1On === true;
  const pcm2On = preset.pcm2On === true;
  const modelingOn = preset.modelingOn === true;
  const normalOn = preset.normalPuOn === true;
  const pcm2Standby = preset.pcm2Standby === true;

  if (preset.pcm1) write(patch.patchPCMTone1.toneSelect, preset.pcm1);
  if (preset.pcm2) write(patch.patchPCMTone2.toneSelect, preset.pcm2);
  if (preset.modelingCategory && preset.modelingTone) {
    const slot = modelingToneFields(editor.gkMode, preset.modelingCategory);
    if (slot) {
      write(slot.categoryField, preset.modelingCategory);
      write(slot.numberField, preset.modelingTone);
    }
  }

  const pcm1Level = preset.pcm1Level ?? (pcm1On ? 100 : 0);
  const pcm2Level =
    preset.pcm2Level ?? (pcm2On ? (pcm2Standby ? 45 : 85) : 0);
  const modelingLevel = preset.modelingLevel ?? (modelingOn ? 100 : 0);
  const normalLevel = preset.normalLevel ?? (normalOn ? 80 : 0);

  write(patch.patchPCMTone1.partLevel, pcm1Level);
  // Standby: write level so CTL unmute is already at curated loudness.
  write(patch.patchPCMTone2.partLevel, pcm2On ? pcm2Level : 0);
  write(patch.modelingTone.level, modelingLevel);
  write(patch.common.normalPuLevel, normalLevel);

  write(patch.patchPCMTone1.muteSwitch, pcm1On && pcm1Level > 0 ? SOUND : MUTE);
  // Standby PCM2: installed (tone + level) but muted until CTL enables layer.
  write(
    patch.patchPCMTone2.muteSwitch,
    pcm2On && !pcm2Standby && pcm2Level > 0 ? SOUND : MUTE,
  );
  write(patch.modelingTone.muteSwitch, modelingOn && modelingLevel > 0 ? SOUND : MUTE);
  write(patch.common.normalPuMute, normalOn && normalLevel > 0 ? SOUND : MUTE);

  const pitchShift = clampPitchShift(pitch.pitchShift ?? 0);
  const chromatic =
    pitch.chromatic !== undefined ? pitch.chromatic : Boolean(preset.chromatic);
  wrote += applyPitchToTemp(editor, { pitchShift, chromatic });

  if (pcm1On && preset.legato && chromatic) {
    write(patch.patchPCMTone1.legatoSwitch, true);
  }
  if (pcm2On && preset.legato && chromatic) {
    write(patch.patchPCMTone2.legatoSwitch, true);
  }

  const portamento = preset.portamento ? 'ON' : 'OFF';
  write(patch.patchPCMTone1.partPortamentoSwitch, portamento);
  write(patch.patchPCMTone2.partPortamentoSwitch, portamento);

  write(patch.patchPCMTone1.partOutputMFXSelect, chain.pcm1Route);
  write(patch.patchPCMTone2.partOutputMFXSelect, chain.pcm2Route);
  write(patch.common.lineSelectModel, chain.modelingRoute);
  write(patch.common.lineSelectNormalPU, chain.normalRoute);

  if (chain.ampType) write(patch.ampModNs.ampType, chain.ampType);
  if (chain.ampGain !== undefined) write(patch.ampModNs.ampGain, chain.ampGain);
  if (chain.ampLevel !== undefined) write(patch.ampModNs.ampLevel, chain.ampLevel);
  write(patch.ampModNs.ampSwitch, chain.ampOn);

  if (chain.modType) write(patch.ampModNs.modType, chain.modType);
  write(patch.ampModNs.modSwitch, chain.modOn);
  write(patch.mfx.mfxSwitch, chain.mfxOn);
  write(patch.sendsAndEq.chorusSwitch, chain.chorusOn);
  write(patch.sendsAndEq.delaySwitch, chain.delayOn);
  write(patch.sendsAndEq.reverbSwitch, chain.reverbOn);
  write(patch.sendsAndEq.eqSwitch, chain.eqOn);

  write(patch.common.patchLevel, preset.patchLevel ?? 100);

  wrote += applyPatchPedals(editor, preset, {
    pcm1On: pcm1On && pcm1Level > 0,
    pcm2On: pcm2On && pcm2Level > 0,
    pcm2Standby,
    modelingOn: modelingOn && modelingLevel > 0,
    normalOn: normalOn && normalLevel > 0,
  });

  const rawName = preset.nameEn.length > 16 ? preset.nameEn.slice(0, 16) : preset.nameEn;
  write(patch.common.patchName, rawName.padEnd(16, ' '));

  return {
    ok: true,
    wrote,
    scopes: preset.scopes,
    impactEn: `Replaces the temporary patch with this sound (${wrote} settings). Pitch shift ${pitchShift}; chromatic ${chromatic ? 'on' : 'off'}. SYSTEM/GK unchanged.`,
    impactPt: `Substitui o patch temporário por este som (${wrote} ajustes). Pitch ${pitchShift}; chromatic ${chromatic ? 'ligado' : 'desligado'}. SYSTEM/GK intactos.`,
  };
}

interface SourceFlags {
  pcm1On: boolean;
  pcm2On: boolean;
  pcm2Standby: boolean;
  modelingOn: boolean;
  normalOn: boolean;
}

/**
 * Write patch-layer CTL / EXP / EXP SW for the preset.
 * Does not touch SYSTEM (see applyCtlExpForPreset) or ASSIGN targets beyond switch-off wipe above.
 */
function applyPatchPedals(
  editor: Gr55Editor,
  preset: MusicalPreset,
  sources: SourceFlags,
): number {
  const patch = TEMPORARY_PATCH;
  let wrote = 0;
  const write = (field: Parameters<Gr55Editor['write']>[0], value: unknown) => {
    editor.write(field as never, value as never);
    wrote++;
  };

  const ctl = ctlAction(preset.ctlExp.ctl);
  const exp = expAction(preset.ctlExp.exp);
  const expSw = expSwAction(preset.ctlExp.expSw);

  const ctlFn = ctl?.systemFunction ?? 'OFF';
  write(patch.common.ctl.status, ctlFn !== 'OFF');
  write(patch.common.ctl.function, ctlFn);

  if (ctlFn === 'HOLD') {
    write(patch.common.ctl.holdSwitchMode, 'LATCH');
    write(patch.common.ctl.holdPcmTone1, sources.pcm1On);
    write(patch.common.ctl.holdPcmTone2, sources.pcm2On || sources.pcm2Standby);
  }

  if (ctlFn === 'TONE SW') {
    // Off = base sources; On = bring standby PCM2 / toggle modeling pad.
    write(patch.common.ctl.offPcmTone1Switch, sources.pcm1On);
    write(patch.common.ctl.offPcmTone2Switch, sources.pcm2On && !sources.pcm2Standby);
    write(patch.common.ctl.offModelingToneSwitch, sources.modelingOn);
    write(patch.common.ctl.offNormalPuSwitch, sources.normalOn);
    write(patch.common.ctl.onPcmTone1Switch, sources.pcm1On);
    write(patch.common.ctl.onPcmTone2Switch, sources.pcm2On || sources.pcm2Standby);
    write(patch.common.ctl.onModelingToneSwitch, sources.modelingOn);
    write(patch.common.ctl.onNormalPuSwitch, sources.normalOn);
  }

  const expFn = exp?.systemFunction ?? 'OFF';
  write(patch.common.expPdlOff.function, expFn);
  write(patch.common.expPdlOn.function, expFn);
  if (expFn === 'PATCH VOLUME' || expFn === 'TONE VOLUME') {
    for (const pedal of [patch.common.expPdlOff, patch.common.expPdlOn] as const) {
      write(pedal.volumeSwitchPCMTone1, sources.pcm1On);
      write(pedal.volumeSwitchPCMTone2, sources.pcm2On || sources.pcm2Standby);
      write(pedal.volumeSwitchModelingTone, sources.modelingOn);
      write(pedal.volumeSwitchNormalPU, sources.normalOn);
    }
  }

  const expSwFn = expSw?.systemFunction ?? 'OFF';
  write(patch.common.expSw.status, expSwFn !== 'OFF');
  write(patch.common.expSw.function, expSwFn);

  return wrote;
}
