import type { FieldReference, FieldType } from '../../../protocol/RolandAddressMap';
import type {
  LayerId,
  MusicalIntention,
  PedalRole,
  PreviewGroup,
} from '../../../intentions/types';
import type { Gr55Editor } from '../editor';
import { TEMPORARY_PATCH } from '../patchLayout';
import {
  INSTRUMENT_PROFILES,
  calibrationOf,
  profileOf,
} from '../instrumentProfiles';
import { SCALE_BASE_MM, SCALE_MAX_MM, SYSTEM, gkSet } from '../systemMap';
import type { Gr55System } from '../systemState';

const patch = TEMPORARY_PATCH;
const MUTE = true;
const SOUND = false;

const LAYER_PCM: Record<LayerId, string> = {
  piano: 'St.Piano 1',
  epiano: 'Stage EP 1',
  strings: 'Strings 1',
  pad: 'Soft Pad 1',
  organ: 'Rock Organ 1',
  harmonica: 'Harmonica 1',
  sax: 'Alto Sax',
  brass: 'Brass 1',
  bass: 'MG Bass 1',
};

export interface FieldChange {
  area: 'patch' | 'system';
  field: FieldReference<FieldType<unknown>>;
  value: unknown;
  /** Previous bytes when the current value has no label in the map. */
  raw?: Uint8Array;
}

export type Translation =
  | { ok: true; groups: PreviewGroup[]; scope: 'patch' | 'system' | 'both'; changes: FieldChange[] }
  | { ok: false; code: 'refused' | 'unsupported'; control?: 'expression' | 'ctl' };

type Scope = 'patch' | 'system' | 'both';

export function translate(
  editor: Gr55Editor,
  system: Gr55System,
  intention: MusicalIntention,
): Translation {
  const changes: FieldChange[] = [];
  const groups = new Set<PreviewGroup>();
  let scope: Scope = 'patch';

  const push = (area: 'patch' | 'system', field: FieldReference<FieldType<unknown>>, value: unknown) => {
    changes.push({ area, field, value });
  };
  const patchField = (field: FieldReference<FieldType<unknown>>, value: unknown) => push('patch', field, value);
  const systemField = (field: FieldReference<FieldType<unknown>>, value: unknown) => {
    push('system', field, value);
    if (scope === 'patch') scope = 'both';
  };

  const refused = (control: 'expression' | 'ctl'): Translation => ({ ok: false, code: 'refused', control });
  const unsupported = (): Translation => ({ ok: false, code: 'unsupported' });

  if (intention.kind === 'instrument') {
    const profile = profileOf(intention.profileId as never);
    if (!profile) return unsupported();
    const select = system.read(SYSTEM.common.gkSetSelect);
    if (!select.ok) return unsupported();
    const set = gkSet(select.value + 1);
    const cal = calibrationOf(profile, intention.calibrationId as never);
    const puType = intention.puType ?? profile.puType;
    const sens = profile.sensSeed;
    patchScopeSystem();
    systemField(set.puType as never, puType);
    systemField(set.playFeel as never, cal?.playFeel ?? 3);
    systemField(set.lowVelocityCut as never, cal?.lowVelocityCut ?? (puType.startsWith('PIEZO') ? 4 : 2));
    systemField(set.velocityDynamics as never, cal?.velocityDynamics ?? 5);
    for (const key of ['string1Sens', 'string2Sens', 'string3Sens', 'string4Sens', 'string5Sens', 'string6Sens'] as const) {
      systemField(set[key] as never, sens);
    }
    if (profile.gkSetName) systemField(set.name as never, profile.gkSetName.slice(0, 8));
    if (intention.scaleMm != null && Number.isFinite(intention.scaleMm)) {
      const mm = Math.max(SCALE_BASE_MM, Math.min(SCALE_MAX_MM, Math.round(intention.scaleMm)));
      systemField(set.scale as never, mm - SCALE_BASE_MM);
      groups.add('gkScale');
    }
    groups.add('gkPickup');
    groups.add('gkTouch');
    groups.add('gkCut');
    groups.add('gkDynamics');
    groups.add('gkBalance');
    groups.add('gkName');
    return done();
  }

  if (intention.kind === 'calibration') {
    const select = system.read(SYSTEM.common.gkSetSelect);
    if (!select.ok) return unsupported();
    const set = gkSet(select.value + 1);
    patchScopeSystem();
    if (intention.playFeel != null) {
      systemField(set.playFeel as never, intention.playFeel);
      groups.add('gkTouch');
    }
    if (intention.lowVelocityCut != null) {
      systemField(set.lowVelocityCut as never, intention.lowVelocityCut);
      groups.add('gkCut');
    }
    if (intention.velocityDynamics != null) {
      systemField(set.velocityDynamics as never, intention.velocityDynamics);
      groups.add('gkDynamics');
    }
    if (intention.sens != null) {
      for (const key of ['string1Sens', 'string2Sens', 'string3Sens', 'string4Sens', 'string5Sens', 'string6Sens'] as const) {
        systemField(set[key] as never, intention.sens);
      }
      groups.add('gkBalance');
    }
    if (groups.size === 0) return unsupported();
    return done();
  }

  if (intention.kind === 'mode') {
    if (intention.mode === 'original') {
      setNormal(false, 100);
      silenceLayer(1);
      silenceLayer(2);
      silenceModeling();
      groups.add('normal');
      groups.add('layer1');
      groups.add('layer2');
    } else if (intention.mode === 'accompaniment') {
      setNormal(true, 0);
      groups.add('normal');
    } else {
      setNormal(false, 100);
      groups.add('normal');
    }
    return done();
  }

  if (intention.kind === 'layer') {
    const tone = LAYER_PCM[intention.layer];
    const pcm = intention.slot === 1 ? patch.patchPCMTone1 : patch.patchPCMTone2;
    patchField(pcm.toneSelect as never, tone);
    patchField(pcm.muteSwitch as never, SOUND);
    patchField(pcm.partLevel as never, clampLevel(intention.level));
    groups.add(intention.slot === 1 ? 'layer1' : 'layer2');
    return done();
  }

  if (intention.kind === 'clear-layer') {
    silenceLayer(intention.slot);
    groups.add(intention.slot === 1 ? 'layer1' : 'layer2');
    return done();
  }

  if (intention.kind === 'effect') {
    writeEffect(intention.effect);
    groups.add('effect');
    return done();
  }

  if (intention.kind === 'recipe' && intention.id === 'nylon-harmonica-exp') {
    const expression = readExpression(editor);
    if (expression === 'other' || expression === 'layer-2') return refused('expression');
    setNormal(false, 100);
    silenceModeling();
    patchField(patch.patchPCMTone1.toneSelect as never, LAYER_PCM.harmonica);
    patchField(patch.patchPCMTone1.muteSwitch as never, SOUND);
    patchField(patch.patchPCMTone1.partLevel as never, 100);
    silenceLayer(2);
    writeExpression(1);
    if (!gatePedal('exp')) return unsupported();
    groups.add('normal');
    groups.add('layer1');
    groups.add('layer2');
    groups.add('expression');
    return done();
  }

  if (intention.kind === 'recipe' && intention.id === 'nylon-piano-strings-ctl') {
    const ctl = readCtl(editor);
    if (ctl === 'other' || ctl === 'toggle-1') return refused('ctl');
    setNormal(false, 100);
    silenceModeling();
    patchField(patch.patchPCMTone1.toneSelect as never, LAYER_PCM.piano);
    patchField(patch.patchPCMTone1.muteSwitch as never, SOUND);
    patchField(patch.patchPCMTone1.partLevel as never, 80);
    patchField(patch.patchPCMTone2.toneSelect as never, LAYER_PCM.strings);
    patchField(patch.patchPCMTone2.muteSwitch as never, SOUND);
    patchField(patch.patchPCMTone2.partLevel as never, 70);
    writeCtlToggle(2);
    if (!gatePedal('ctl')) return unsupported();
    groups.add('normal');
    groups.add('layer1');
    groups.add('layer2');
    groups.add('ctl');
    return done();
  }

  if (intention.kind === 'recipe') {
    setNormal(true, 0);
    silenceModeling();
    patchField(patch.patchPCMTone1.toneSelect as never, LAYER_PCM.sax);
    patchField(patch.patchPCMTone1.muteSwitch as never, SOUND);
    patchField(patch.patchPCMTone1.partLevel as never, 100);
    silenceLayer(2);
    groups.add('normal');
    groups.add('layer1');
    groups.add('layer2');
    return done();
  }

  return unsupported();

  function done(): Translation {
    return { ok: true, groups: [...groups], scope, changes };
  }

  function patchScopeSystem() {
    scope = 'system';
  }

  function setNormal(muted: boolean, level: number) {
    patchField(patch.common.normalPuMute as never, muted);
    patchField(patch.common.normalPuLevel as never, level);
  }

  function silenceLayer(slot: 1 | 2) {
    const pcm = slot === 1 ? patch.patchPCMTone1 : patch.patchPCMTone2;
    patchField(pcm.muteSwitch as never, MUTE);
    patchField(pcm.partLevel as never, 0);
  }

  function silenceModeling() {
    patchField(patch.modelingTone.muteSwitch as never, MUTE);
  }

  function writeExpression(slot: 1 | 2) {
    const exp = patch.common.expPdlOff;
    patchField(exp.function as never, 'TONE VOLUME');
    patchField(exp.volumeSwitchPCMTone1 as never, slot === 1);
    patchField(exp.volumeSwitchPCMTone2 as never, slot === 2);
    patchField(exp.volumeSwitchModelingTone as never, false);
    patchField(exp.volumeSwitchNormalPU as never, false);
  }

  function writeCtlToggle(slot: 1 | 2) {
    const ctl = patch.common.ctl;
    patchField(ctl.function as never, 'TONE SW');
    patchField(ctl.status as never, false);
    patchField(ctl.offPcmTone1Switch as never, slot !== 1);
    patchField(ctl.onPcmTone1Switch as never, true);
    patchField(ctl.offPcmTone2Switch as never, slot !== 2);
    patchField(ctl.onPcmTone2Switch as never, true);
    patchField(ctl.offModelingToneSwitch as never, false);
    patchField(ctl.onModelingToneSwitch as never, false);
    patchField(ctl.offNormalPuSwitch as never, true);
    patchField(ctl.onNormalPuSwitch as never, true);
  }

  function writeEffect(effect: 'dry' | 'small-room' | 'soft-ambience' | 'solo-delay') {
    const fx = patch.sendsAndEq;
    if (effect === 'dry') {
      patchField(fx.reverbSwitch as never, false);
      patchField(fx.delaySwitch as never, false);
      patchField(fx.chorusSwitch as never, false);
      return;
    }
    if (effect === 'solo-delay') {
      patchField(fx.delaySwitch as never, true);
      patchField(fx.delayType as never, 'SINGLE');
      patchField(fx.delayEffectLevel as never, 40);
      patchField(fx.reverbSwitch as never, false);
      patchField(fx.chorusSwitch as never, false);
      return;
    }
    patchField(fx.reverbSwitch as never, true);
    patchField(fx.reverbType as never, effect === 'small-room' ? 'ROOM' : 'AMBIENCE');
    patchField(fx.reverbEffectLevel as never, effect === 'small-room' ? 30 : 18);
    patchField(fx.delaySwitch as never, false);
    patchField(fx.chorusSwitch as never, false);
  }

  function gatePedal(which: 'exp' | 'ctl'): boolean {
    const field = which === 'exp' ? SYSTEM.pedals.expOffFunction : SYSTEM.pedals.ctlFunction;
    const current = system.read(field);
    if (!current.ok) return false;
    if (current.value !== 'PATCH SETTING') {
      systemField(field as never, 'PATCH SETTING');
      groups.add('systemPedals');
    }
    return true;
  }
}

export function readExpression(editor: Gr55Editor): PedalRole {
  const exp = patch.common.expPdlOff;
  const fn = editor.read(exp.function);
  if (!fn.ok) return 'other';
  if (fn.value === 'OFF') return 'off';
  if (fn.value !== 'TONE VOLUME') return 'other';
  const pcm1 = editor.read(exp.volumeSwitchPCMTone1);
  const pcm2 = editor.read(exp.volumeSwitchPCMTone2);
  const modeling = editor.read(exp.volumeSwitchModelingTone);
  const normal = editor.read(exp.volumeSwitchNormalPU);
  if (!pcm1.ok || !pcm2.ok || !modeling.ok || !normal.ok) return 'other';
  if (pcm1.value === true && pcm2.value === false && modeling.value === false && normal.value === false) {
    return 'layer-1';
  }
  if (pcm2.value === true && pcm1.value === false && modeling.value === false && normal.value === false) {
    return 'layer-2';
  }
  return 'other';
}

export function readCtl(editor: Gr55Editor): PedalRole {
  const ctl = patch.common.ctl;
  const fn = editor.read(ctl.function);
  if (!fn.ok) return 'other';
  if (fn.value === 'OFF') return 'off';
  if (fn.value !== 'TONE SW') return 'other';
  const off1 = editor.read(ctl.offPcmTone1Switch);
  const on1 = editor.read(ctl.onPcmTone1Switch);
  const off2 = editor.read(ctl.offPcmTone2Switch);
  const on2 = editor.read(ctl.onPcmTone2Switch);
  const offModel = editor.read(ctl.offModelingToneSwitch);
  const onModel = editor.read(ctl.onModelingToneSwitch);
  const offNormal = editor.read(ctl.offNormalPuSwitch);
  const onNormal = editor.read(ctl.onNormalPuSwitch);
  if (
    !off1.ok ||
    !on1.ok ||
    !off2.ok ||
    !on2.ok ||
    !offModel.ok ||
    !onModel.ok ||
    !offNormal.ok ||
    !onNormal.ok
  ) {
    return 'other';
  }
  const base =
    offModel.value === false &&
    onModel.value === false &&
    offNormal.value === true &&
    onNormal.value === true &&
    on1.value === true &&
    on2.value === true;
  if (!base) return 'other';
  if (off2.value === false && off1.value === true) return 'toggle-2';
  if (off1.value === false && off2.value === true) return 'toggle-1';
  return 'other';
}

function clampLevel(level: number): number {
  if (!Number.isFinite(level)) return 0;
  return Math.max(0, Math.min(100, Math.round(level)));
}

export const KNOWN_PROFILES = INSTRUMENT_PROFILES;
