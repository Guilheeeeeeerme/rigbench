import type { Gr55Editor } from '../../devices/gr55/editor';
import type { Gr55System } from '../../devices/gr55/systemState';
import { decide } from '../policy';
import type { PolicyContext } from '../policy';
import type { RegistryEntry } from '../fieldRegistry';
import { resolveSystemRef } from './systemRefs';
import type { MacroGroup, MacroOption, MacroWrite } from './types';

export type ApplyOutcome =
  | { ok: true; wrote: number; staged: number; filter?: string; opensAdvanced?: boolean }
  | { ok: false; reason: 'stub' | 'denied' | 'missing-field' | 'opens-advanced' | 'empty' };

export interface ApplyTargets {
  editor?: Gr55Editor;
  system?: Gr55System;
  index: Map<string, RegistryEntry>;
  policy: PolicyContext;
  /** Library browse filter callback (UI state). */
  onLibraryFilter?: (style: string) => void;
}

function applyPatchWrite(
  write: Extract<MacroWrite, { domain: 'patch' }>,
  targets: ApplyTargets,
): 'ok' | 'denied' | 'missing' {
  const entry = targets.index.get(write.key);
  if (!entry || !targets.editor) return 'missing';
  if (decide(entry, 'changePlan', targets.policy) !== 'allow') return 'denied';
  targets.editor.write(entry.ref, write.value as never);
  return 'ok';
}

function applySystemWrite(
  write: Extract<MacroWrite, { domain: 'system' }>,
  targets: ApplyTargets,
): 'ok' | 'denied' | 'missing' {
  if (!targets.system) return 'missing';
  // Immediate DT1 on Global — no staging layer.
  if (decide(null, 'writeSystem', targets.policy) !== 'allow') return 'denied';
  const field = resolveSystemRef(targets.system, write.ref);
  if (!field) return 'missing';
  targets.system.write(field, write.value as never);
  return 'ok';
}

/**
 * Applies one macro option. Patch and system writes go through immediately (DT1).
 * Library filter updates UI state only.
 */
export function applyMacroOption(
  group: MacroGroup,
  option: MacroOption,
  targets: ApplyTargets,
): ApplyOutcome {
  if (option.opensAdvanced) {
    return { ok: false, reason: 'opens-advanced' };
  }
  if (!group.implemented) {
    return { ok: false, reason: 'stub' };
  }
  if (option.writes.length === 0) {
    return { ok: false, reason: 'empty' };
  }

  let wrote = 0;
  let staged = 0;
  let filter: string | undefined;

  for (const write of option.writes) {
    if (write.domain === 'patch') {
      const result = applyPatchWrite(write, targets);
      if (result === 'denied') return { ok: false, reason: 'denied' };
      if (result === 'missing') return { ok: false, reason: 'missing-field' };
      wrote += 1;
    } else if (write.domain === 'system') {
      const result = applySystemWrite(write, targets);
      if (result === 'denied') return { ok: false, reason: 'denied' };
      if (result === 'missing') return { ok: false, reason: 'missing-field' };
      wrote += 1;
    } else if (write.domain === 'library') {
      filter = write.style;
      targets.onLibraryFilter?.(write.style);
    }
  }

  return { ok: true, wrote, staged, filter };
}
