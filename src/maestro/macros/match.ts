import type { Gr55Editor } from '../../devices/gr55/editor';
import type { Gr55System } from '../../devices/gr55/systemState';
import type { RegistryEntry } from '../fieldRegistry';
import { resolveSystemRef } from './systemRefs';
import type { MacroGroup, MacroOption, MacroWrite, MatchResult } from './types';

function valuesEqual(a: unknown, b: unknown): boolean {
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) < 0.05 || Math.round(a) === Math.round(b);
  }
  return Object.is(a, b);
}

function readPatchValue(editor: Gr55Editor, entry: RegistryEntry): unknown | undefined {
  const result = editor.read(entry.ref);
  return result.ok ? result.value : undefined;
}

function readWriteValue(
  write: MacroWrite,
  editor: Gr55Editor | undefined,
  system: Gr55System | undefined,
  index: Map<string, RegistryEntry>,
): { expected: unknown; actual: unknown | undefined; comparable: boolean } {
  if (write.domain === 'patch') {
    const entry = index.get(write.key);
    if (!entry || !editor) return { expected: write.value, actual: undefined, comparable: false };
    return {
      expected: write.value,
      actual: readPatchValue(editor, entry),
      comparable: true,
    };
  }
  if (write.domain === 'system') {
    if (!system) return { expected: write.value, actual: undefined, comparable: false };
    const field = resolveSystemRef(system, write.ref);
    if (!field) return { expected: write.value, actual: undefined, comparable: false };
    const result = system.read(field);
    return {
      expected: write.value,
      actual: result.ok ? result.value : undefined,
      comparable: true,
    };
  }
  // Library filters are UI state — not matched against the pedal.
  return { expected: write.style, actual: undefined, comparable: false };
}

function scoreOption(
  option: MacroOption,
  editor: Gr55Editor | undefined,
  system: Gr55System | undefined,
  index: Map<string, RegistryEntry>,
): { hits: number; total: number } {
  let hits = 0;
  let total = 0;
  for (const write of option.writes) {
    const { expected, actual, comparable } = readWriteValue(write, editor, system, index);
    if (!comparable) continue;
    total += 1;
    if (actual !== undefined && valuesEqual(actual, expected)) hits += 1;
  }
  return { hits, total };
}

/**
 * Picks the best matching option for a group, or Custom when nothing is close.
 * Options with zero comparable writes never win.
 */
export function matchGroup(
  group: MacroGroup,
  editor: Gr55Editor | undefined,
  system: Gr55System | undefined,
  index: Map<string, RegistryEntry>,
): MatchResult {
  if (group.kind !== 'pills' || group.options.length === 0) return { kind: 'unknown' };

  let best: { optionId: string; score: number; total: number } | undefined;
  for (const option of group.options) {
    if (option.opensAdvanced || option.writes.length === 0) continue;
    const { hits, total } = scoreOption(option, editor, system, index);
    if (total === 0) continue;
    if (!best || hits > best.score || (hits === best.score && total < best.total)) {
      best = { optionId: option.id, score: hits, total };
    }
  }
  if (!best) return { kind: 'custom' };
  // Highlight a pill only when every comparable field of that option matches.
  if (best.score < best.total) return { kind: 'custom' };
  return { kind: 'option', optionId: best.optionId, score: best.score, total: best.total };
}
