import type { Locale } from '../copy';
import type { Gr55System } from '../devices/gr55/systemState';
import { SCALE_BASE_MM } from '../devices/gr55/systemMap';
import { resolveSystemRef } from './macros/systemRefs';

export interface SystemChange {
  /** Macro-style ref: `gkSet.active.puType`, `common.gkSetSelect`, … */
  ref: string;
  value: string | number | boolean;
  why?: string;
}

export interface SystemPlanItem {
  change: SystemChange;
  action: 'accept' | 'reject';
  reason?: string;
}

export interface SystemPlan {
  accepted: SystemPlanItem[];
  rejected: SystemPlanItem[];
}

export interface CompiledSystemRecipe {
  intent: string;
  changes: SystemChange[];
  replyEn: string;
  replyPt: string;
}

/** Classical / Godin / Caimbé nylon with RMC-class 13-pin piezo (OM + community). */
const NYLON_SCALE_MM = 648;
const NYLON_SENS = 42; // below factory ~65; reduces ghost triggers on piezo/nylon

export function isGlobalGkRecipeQuery(query: string): boolean {
  const lower = query.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  const instrument =
    /caimbe|godin|multiac|nylon|piezo|violao|rmc|graphtech|fishman/.test(lower);
  const scope =
    /global|geral|sistema|gk|sensib|velocity|play.?feel|cut|ghost|configur/.test(lower);
  return instrument && scope;
}

/**
 * Best-practice SYSTEM GK SET for nylon piezo (Caimbé ≈ Godin Multiac / RMC).
 * Grounded in: OM GK SETTING, Roland support PU TYPE list, Sweetwater/VGuitar
 * Godin Multiac tips (PIEZO R, ~648 mm, moderate SEN, high low-velocity cut).
 * Play Feel / Low Velocity Cut are not yet in systemMap — reply notes that.
 */
export function compileNylonPiezoGkRecipe(query: string): CompiledSystemRecipe | undefined {
  if (!isGlobalGkRecipeQuery(query)) return undefined;

  const scaleStored = NYLON_SCALE_MM - SCALE_BASE_MM;
  const sens = NYLON_SENS;
  const changes: SystemChange[] = [
    { ref: 'gkSet.active.name', value: 'Caimbe', why: 'label this GK profile' },
    { ref: 'gkSet.active.puType', value: 'PIEZO R', why: 'RMC-class piezo (Godin/Caimbé)' },
    { ref: 'gkSet.active.scale', value: scaleStored, why: '648 mm classical scale' },
    { ref: 'gkSet.active.puPhase', value: 'NORMAL', why: 'default phase' },
    { ref: 'gkSet.active.puDirection', value: 'NORMAL', why: 'default direction' },
    { ref: 'gkSet.active.s1s2Position', value: 'NORMAL', why: 'default S1/S2' },
    { ref: 'gkSet.active.normalPuGain', value: 0, why: 'unity normal PU gain' },
    { ref: 'gkSet.active.string1Sens', value: sens, why: 'nylon/piezo SEN start' },
    { ref: 'gkSet.active.string2Sens', value: sens, why: 'nylon/piezo SEN start' },
    { ref: 'gkSet.active.string3Sens', value: sens, why: 'nylon/piezo SEN start' },
    { ref: 'gkSet.active.string4Sens', value: sens, why: 'nylon/piezo SEN start' },
    { ref: 'gkSet.active.string5Sens', value: sens, why: 'nylon/piezo SEN start' },
    { ref: 'gkSet.active.string6Sens', value: sens, why: 'nylon/piezo SEN start' },
  ];

  return {
    intent: 'GK Caimbé / nylon piezo',
    changes,
    replyEn:
      'Applied a pedal-wide GK SET for a nylon piezo like Caimbé/Godin (RMC): PU TYPE PIEZO R, ' +
      'scale 648 mm, SEN 42 on all strings, phase/direction normal. SYSTEM settings save on the pedal. ' +
      'Fine-tune each string SEN while playing hard (meter near full, no clip). ' +
      'Play Feel / Low Velocity Cut are not mapped in this app build yet — set VEL on the pedal ' +
      '(Play Feel 4–5, Low Velocity Cut 8–9) if ghost notes remain.',
    replyPt:
      'Apliquei um GK SET de sistema para violão nylon piezo (Caimbé/Godin/RMC): PU TYPE PIEZO R, ' +
      'escala 648 mm, SEN 42 em todas as cordas, fase/direção normal. Isso é SYSTEM (grava no pedal). ' +
      'Ajuste fino: toque forte em cada corda e suba/desça SEN sem estourar o medidor. ' +
      'Play Feel / Low Velocity Cut ainda não estão no mapa deste app — no pedal, em VEL, use ' +
      'Play Feel 4–5 e Low Velocity Cut 8–9 se ainda houver nota fantasma.',
  };
}

export function systemRecipeReply(recipe: CompiledSystemRecipe, locale: Locale): string {
  return locale === 'pt-BR' ? recipe.replyPt : recipe.replyEn;
}

export function validateSystemPlan(
  changes: readonly SystemChange[],
  system: Gr55System,
): SystemPlan {
  const accepted: SystemPlanItem[] = [];
  const rejected: SystemPlanItem[] = [];
  for (const change of changes) {
    const field = resolveSystemRef(system, change.ref);
    if (!field) {
      rejected.push({ change, action: 'reject', reason: 'unknown-system-ref' });
      continue;
    }
    accepted.push({ change, action: 'accept' });
  }
  return { accepted, rejected };
}

export function applySystemPlan(system: Gr55System, plan: SystemPlan): number {
  let wrote = 0;
  for (const item of plan.accepted) {
    const field = resolveSystemRef(system, item.change.ref);
    if (!field) continue;
    system.write(field, item.change.value as never);
    wrote += 1;
  }
  return wrote;
}
