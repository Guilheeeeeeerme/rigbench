import type { RegistryEntry } from './fieldRegistry';

export interface ContextRequest {
  query: string;
  patchName: string;
  sourceNote: string;
  modeNote: string;
  visiblePageId?: string;
  /** Soft character budget for the serialized context. Default 14_000. */
  charBudget?: number;
}

export type Depth = 'full' | 'brief' | 'hidden';

export interface ContextField {
  entry: RegistryEntry;
  depth: Depth;
  value: string;
}

const DEFAULT_BUDGET = 14_000;

const STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'that',
  'this',
  'more',
  'less',
  'your',
  'into',
  'onto',
]);

/** Phrase shown above brief keys so the model can request a search round. */
export const SEARCH_VOCABULARY_HINT = 'reply kind `search` to see any of these';

function queryTokens(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length > 3 && !STOPWORDS.has(token));
}

function scoreEntry(entry: RegistryEntry, tokens: string[], visiblePageId?: string): number {
  if (entry.readOnly) return -1;
  const label = entry.label.toLowerCase();
  if (entry.essential || tokens.some((token) => label.includes(token))) return 3;
  if (visiblePageId && entry.pageId === visiblePageId) return 1;
  return 0;
}

function depthOf(score: number): Depth {
  if (score >= 3) return 'full';
  if (score === 1) return 'brief';
  return 'hidden';
}

export function constraintsOf(entry: RegistryEntry): string {
  let base: string;
  switch (entry.kind) {
    case 'numeric':
      base = `number ${entry.min ?? '?'}..${entry.max ?? '?'}`;
      break;
    case 'enum':
      base = `one of: ${(entry.labels ?? []).join(' | ')}`;
      break;
    case 'boolean':
      base = 'true or false';
      break;
    case 'string':
      base = 'text';
      break;
    default:
      base = 'other';
  }
  if (entry.complex) {
    return `${base} [read-only for you: use the editor]`;
  }
  return base;
}

/**
 * Query-aware context ladder. Skips read-only fields; demotes full→brief from the
 * bottom until serialization fits the character budget. Never promotes past budget.
 */
export function assembleContext(
  entries: readonly RegistryEntry[],
  readValue: (entry: RegistryEntry) => string,
  request: ContextRequest,
): ContextField[] {
  const tokens = queryTokens(request.query);
  const scored = entries
    .map((entry) => {
      const score = scoreEntry(entry, tokens, request.visiblePageId);
      if (score < 0) return undefined;
      return {
        entry,
        depth: depthOf(score),
        value: readValue(entry),
        score,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== undefined);

  const budget = request.charBudget ?? DEFAULT_BUDGET;
  const fields: ContextField[] = scored.map(({ entry, depth, value }) => ({
    entry,
    depth,
    value,
  }));

  // Demote full→brief from the end until the serialized payload fits.
  let serialized = serializeContext(fields, request);
  while (serialized.length > budget) {
    let demoted = false;
    for (let i = fields.length - 1; i >= 0; i--) {
      if (fields[i].depth === 'full') {
        fields[i] = { ...fields[i], depth: 'brief' };
        demoted = true;
        break;
      }
    }
    if (!demoted) break;
    serialized = serializeContext(fields, request);
  }

  return fields;
}

export function serializeContext(
  fields: readonly ContextField[],
  header?: Pick<ContextRequest, 'patchName' | 'sourceNote' | 'modeNote'>,
): string {
  const lines: string[] = [];
  if (header) {
    lines.push(`patch: ${header.patchName}`);
    lines.push(`source: ${header.sourceNote}`);
    lines.push(`mode: ${header.modeNote}`);
    lines.push('');
  }

  lines.push('FIELDS:');
  for (const field of fields) {
    if (field.depth !== 'full') continue;
    lines.push(
      `${field.entry.key} | ${field.entry.label} | ${field.value} | ${constraintsOf(field.entry)}`,
    );
  }

  const brief = fields.filter((field) => field.depth === 'brief');
  if (brief.length > 0) {
    lines.push('');
    lines.push(SEARCH_VOCABULARY_HINT);
    for (const field of brief) {
      lines.push(`${field.entry.key} (${field.entry.label})`);
    }
  }

  return lines.join('\n');
}
