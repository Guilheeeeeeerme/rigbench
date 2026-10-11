import { scopeOf } from '../devices/gr55/changeTracking';
import { editorHref } from '../devices/gr55/pages';
import type { PageId } from '../devices/gr55/pages';
import { isBooleanField } from '../protocol/RolandAddressMap';
import type { ChangeItem, ValidatedItem, ValidatedPlan } from './contracts';
import type { RegistryEntry } from './fieldRegistry';

export type ReadCurrent = (entry: RegistryEntry) => string;

function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function nearestLabel(value: string, labels: readonly string[]): string | undefined {
  const needle = value.toLowerCase();
  let best: string | undefined;
  let bestDist = Infinity;
  for (const label of labels) {
    const dist = editDistance(needle, label.toLowerCase());
    if (dist < bestDist) {
      bestDist = dist;
      best = label;
    }
  }
  return bestDist <= 2 ? best : undefined;
}

/** Exact, prefix, or unique substring match for large enums (PCM tones). */
function resolveEnumLabel(
  value: string,
  labels: readonly string[],
): { ok: true; label: string } | { ok: false; reason: string } {
  const raw = value.trim();
  const exact = labels.find((label) => label.toLowerCase() === raw.toLowerCase());
  if (exact) return { ok: true, label: exact };

  const needle = raw.toLowerCase();
  if (needle.length < 2) {
    return { ok: false, reason: 'unknown-enum-value' };
  }
  const starts = labels.filter((label) => label.toLowerCase().startsWith(needle));
  if (starts.length === 1) return { ok: true, label: starts[0] };
  if (starts.length > 1) {
    return {
      ok: false,
      reason: `did you mean: ${starts.slice(0, 8).join(' | ')}?`,
    };
  }
  const contains = labels.filter((label) => label.toLowerCase().includes(needle));
  if (contains.length === 1) return { ok: true, label: contains[0] };
  if (contains.length > 1) {
    return {
      ok: false,
      reason: `did you mean: ${contains.slice(0, 8).join(' | ')}?`,
    };
  }
  const suggestion = nearestLabel(raw, labels);
  return {
    ok: false,
    reason: suggestion ? `did you mean: ${suggestion}?` : 'unknown-enum-value',
  };
}

function asciiPrintable(text: string): string {
  return [...text]
    .map((ch) => {
      const code = ch.charCodeAt(0);
      return code >= 32 && code <= 126 ? ch : '?';
    })
    .join('');
}

function reject(
  change: ChangeItem,
  entry: RegistryEntry | null,
  current: string,
  proposed: string,
  reason: string,
): ValidatedItem {
  return { change, entry, action: 'reject', current, proposed, reason };
}

function coerceBoolean(
  value: string | number | boolean,
  entry: RegistryEntry,
):
  { ok: true; value: boolean; proposed: string } | { ok: false; reason: string; proposed: string } {
  const type = entry.ref.definition.type;
  const trueLabel = isBooleanField(type) ? type.trueLabel : 'On';
  const falseLabel = isBooleanField(type) ? type.falseLabel : 'Off';
  const inverted = isBooleanField(type) ? type.invertedForDisplay : false;
  if (typeof value === 'boolean') {
    return { ok: true, value, proposed: value ? trueLabel : falseLabel };
  }
  if (typeof value === 'number') {
    if (value === 1) return { ok: true, value: true, proposed: trueLabel };
    if (value === 0) return { ok: true, value: false, proposed: falseLabel };
  }
  const raw = String(value).trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  // Mute fields: true=MUTE, false=UNMUTE. Musician "on/ligar" means sounding.
  if (inverted || entry.fieldKey.toLowerCase().includes('mute')) {
    if (['mute', 'muted', 'true', '1', trueLabel.toLowerCase()].includes(raw)) {
      return { ok: true, value: true, proposed: trueLabel };
    }
    if (
      ['unmute', 'sound', 'sounding', 'false', '0', falseLabel.toLowerCase()].includes(raw)
    ) {
      return { ok: true, value: false, proposed: falseLabel };
    }
    if (['on', 'ligar', 'ligado'].includes(raw)) {
      return { ok: true, value: false, proposed: falseLabel };
    }
    if (['off', 'desligar', 'desligado'].includes(raw)) {
      return { ok: true, value: true, proposed: trueLabel };
    }
  }
  const truthy = new Set(['true', 'on', '1', 'ligar', 'ligado', trueLabel.toLowerCase()]);
  const falsy = new Set(['false', 'off', '0', 'desligar', 'desligado', falseLabel.toLowerCase()]);
  if (truthy.has(raw)) return { ok: true, value: true, proposed: trueLabel };
  if (falsy.has(raw)) return { ok: true, value: false, proposed: falseLabel };
  const suggestion = nearestLabel(String(value), [trueLabel, falseLabel, 'ON', 'OFF']);
  return {
    ok: false,
    proposed: String(value),
    reason: suggestion ? `did you mean: ${suggestion}?` : 'not a boolean',
  };
}

function validateOne(
  change: ChangeItem,
  index: Map<string, RegistryEntry>,
  readCurrent: ReadCurrent,
): ValidatedItem {
  const entry = index.get(change.key) ?? null;
  const proposed = String(change.value);

  if (!entry) {
    return reject(change, null, '', proposed, 'unknown-parameter');
  }

  const current = readCurrent(entry);

  if (entry.readOnly || entry.complex) {
    const href = editorHref(entry.pageId as PageId, entry.sectionSlug);
    return reject(change, entry, current, proposed, `not-writable-v1 (${href})`);
  }

  if (scopeOf(entry.ref.address) !== 'working-copy') {
    return reject(change, entry, current, proposed, 'system-scope');
  }

  switch (entry.kind) {
    case 'numeric': {
      const n = typeof change.value === 'number' ? change.value : Number(change.value);
      if (!Number.isFinite(n) || !Number.isInteger(n)) {
        return reject(change, entry, current, proposed, 'not-an-integer');
      }
      const min = entry.min ?? Number.NEGATIVE_INFINITY;
      const max = entry.max ?? Number.POSITIVE_INFINITY;
      if (n < min || n > max) {
        return reject(change, entry, current, String(n), `out-of-range (${min}..${max})`);
      }
      return {
        change,
        entry,
        action: 'accept',
        current,
        proposed: String(n),
        coerced: n,
      };
    }
    case 'boolean': {
      const result = coerceBoolean(change.value, entry);
      if (!result.ok) {
        return reject(change, entry, current, result.proposed, result.reason);
      }
      return {
        change,
        entry,
        action: 'accept',
        current,
        proposed: result.proposed,
        coerced: result.value,
      };
    }
    case 'enum': {
      const labels = entry.labels ?? [];
      const raw = String(change.value);
      const resolved = resolveEnumLabel(raw, labels);
      if (resolved.ok) {
        return {
          change,
          entry,
          action: 'accept',
          current,
          proposed: resolved.label,
          coerced: resolved.label,
        };
      }
      return reject(change, entry, current, raw, resolved.reason);
    }
    case 'string': {
      const size = entry.ref.definition.size;
      const trimmed = asciiPrintable(String(change.value).trim());
      const truncated = trimmed.slice(0, size);
      const truncatedNote = truncated.length < trimmed.length;
      return {
        change,
        entry,
        action: truncatedNote ? 'clamp' : 'accept',
        current,
        proposed: truncated,
        coerced: truncated,
        reason: truncatedNote ? 'truncated' : undefined,
      };
    }
    default:
      return reject(change, entry, current, proposed, 'unsupported-kind');
  }
}

/** Validate model-proposed changes against the registry. Order matches input. */
export function validatePlan(
  changes: readonly ChangeItem[],
  index: Map<string, RegistryEntry>,
  readCurrent: ReadCurrent,
): ValidatedPlan {
  const accepted: ValidatedItem[] = [];
  const clamped: ValidatedItem[] = [];
  const rejected: ValidatedItem[] = [];

  for (const change of changes) {
    const item = validateOne(change, index, readCurrent);
    if (item.action === 'accept') accepted.push(item);
    else if (item.action === 'clamp') clamped.push(item);
    else rejected.push(item);
  }

  return { accepted, clamped, rejected };
}
