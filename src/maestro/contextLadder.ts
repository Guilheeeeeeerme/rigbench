import type { RegistryEntry } from './fieldRegistry';
import { GR55_RECIPE_PLAYBOOK } from './playbook';
import {
  RECIPE_FIELD_KEYS,
  isPatchRecipeQuery,
  matchPcmTones,
} from './toneMatch';

export interface ContextRequest {
  query: string;
  patchName: string;
  sourceNote: string;
  modeNote: string;
  /** bank | system — hard scope for the model. */
  sessionNote?: string;
  visiblePageId?: string;
  /** Soft character budget for the serialized context. Default 16_000. */
  charBudget?: number;
}

export type Depth = 'full' | 'brief' | 'hidden';

export interface ContextField {
  entry: RegistryEntry;
  depth: Depth;
  value: string;
  /** Extra enum candidates (e.g. PCM tones) shown instead of the full list. */
  enumCandidates?: string[];
}

const DEFAULT_BUDGET = 16_000;
const LARGE_ENUM = 40;

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
  'para',
  'como',
  'uma',
  'com',
  'dos',
  'das',
  'que',
  'por',
]);

/** Phrase shown above brief keys so the model can request a search round. */
export const SEARCH_VOCABULARY_HINT = 'reply kind `search` to see any of these';

/** Map PT/common words onto English label fragments for scoring. */
const QUERY_EXPAND: readonly { match: RegExp; add: string }[] = [
  { match: /metais|brass|sopro/, add: 'brass tone mute level ctl' },
  { match: /gaita|harmonica|acorde[aã]o|accordion/, add: 'harmonica accordion tone mute' },
  { match: /cumbia|teclado/, add: 'accordion organ lead tone' },
  { match: /viol[aã]o|pickup|normal/, add: 'normal pickup mute level' },
  { match: /ctl|pedal/, add: 'ctl function tone switch hold' },
  { match: /init|inicializ|zerar/, add: 'amp mod delay reverb chorus eq switch mute' },
  { match: /pcm\s*1|pcm1/, add: 'pcm tone mute level' },
  { match: /n[ií]vel|level|mix|50\/50/, add: 'level part' },
];

function expandQuery(query: string): string {
  const lower = query.toLowerCase();
  const extras = QUERY_EXPAND.filter((row) => row.match.test(lower)).map((row) => row.add);
  return extras.length ? `${query} ${extras.join(' ')}` : query;
}

function queryTokens(query: string): string[] {
  const expanded = expandQuery(query);
  return expanded
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

function scoreEntry(
  entry: RegistryEntry,
  tokens: string[],
  visiblePageId: string | undefined,
  recipe: boolean,
): number {
  if (entry.readOnly) return -1;
  const label = entry.label.toLowerCase();
  const key = entry.key.toLowerCase();
  if (tokens.some((token) => label.includes(token) || key.includes(token))) {
    return 3;
  }
  // Full patch recipes use RECIPE_FIELD_KEYS; do not promote every essential page.
  if (entry.essential && !recipe) return 3;
  if (visiblePageId && entry.pageId === visiblePageId) return 1;
  return 0;
}

function depthOf(score: number): Depth {
  if (score >= 3) return 'full';
  if (score === 1) return 'brief';
  return 'hidden';
}

export function constraintsOf(entry: RegistryEntry, candidates?: readonly string[]): string {
  let base: string;
  switch (entry.kind) {
    case 'numeric':
      base = `number ${entry.min ?? '?'}..${entry.max ?? '?'}`;
      break;
    case 'enum': {
      const labels = entry.labels ?? [];
      if (candidates && candidates.length > 0) {
        base = `one of (candidates): ${candidates.join(' | ')}`;
      } else if (labels.length > LARGE_ENUM) {
        base = `PCM/enum name (${labels.length} values) — use an exact pedal name; reply kind search with a tone word if unsure`;
      } else {
        base = `one of: ${labels.join(' | ')}`;
      }
      break;
    }
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

function toneCatalog(entries: readonly RegistryEntry[]): readonly string[] {
  return (
    entries.find((entry) => entry.key === 'pcm1/tone/toneSelect')?.labels ??
    entries.find((entry) => entry.fieldKey === 'toneSelect')?.labels ??
    []
  );
}

/**
 * Query-aware context ladder. Skips read-only fields; demotes full→brief from the
 * bottom until serialization fits the character budget. Never promotes past budget.
 * Large enums (PCM tones) use query candidates instead of dumping ~900 names.
 */
export function assembleContext(
  entries: readonly RegistryEntry[],
  readValue: (entry: RegistryEntry) => string,
  request: ContextRequest,
): ContextField[] {
  const tokens = queryTokens(request.query);
  const recipe = isPatchRecipeQuery(request.query);
  const recipeKeys = new Set(recipe ? RECIPE_FIELD_KEYS : []);
  const tones = toneCatalog(entries);
  const toneHits = matchPcmTones(request.query, tones);

  const byKey = new Map(entries.map((entry) => [entry.key, entry]));
  const scored = entries
    .map((entry) => {
      if (entry.readOnly) return undefined;
      let score: number;
      if (recipe) {
        // Recipes stay on the curated key set — token "tone" must not pull in every modeling field.
        score = recipeKeys.has(entry.key) ? 3 : 0;
      } else {
        score = scoreEntry(entry, tokens, request.visiblePageId, false);
        if (score < 0) return undefined;
      }
      const enumCandidates =
        entry.fieldKey === 'toneSelect' && toneHits.length > 0 ? toneHits : undefined;
      return {
        entry,
        depth: depthOf(score),
        value: readValue(entry),
        score,
        enumCandidates,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== undefined);

  // Ensure recipe keys exist even if somehow missing from the scored pass.
  for (const key of recipeKeys) {
    if (scored.some((item) => item.entry.key === key)) continue;
    const entry = byKey.get(key);
    if (!entry || entry.readOnly) continue;
    scored.push({
      entry,
      depth: 'full',
      value: readValue(entry),
      score: 3,
      enumCandidates:
        entry.fieldKey === 'toneSelect' && toneHits.length > 0 ? toneHits : undefined,
    });
  }

  const budget = request.charBudget ?? DEFAULT_BUDGET;
  const fields: ContextField[] = scored.map(({ entry, depth, value, enumCandidates }) => ({
    entry,
    depth,
    value,
    enumCandidates,
  }));

  // Shrink: brief→hidden first, then non-recipe full→brief. Keep recipe keys full.
  let serialized = serializeContext(fields, request);
  while (serialized.length > budget) {
    let demoted = false;
    for (let i = fields.length - 1; i >= 0; i--) {
      if (fields[i].depth === 'brief') {
        fields[i] = { ...fields[i], depth: 'hidden' };
        demoted = true;
        break;
      }
    }
    if (!demoted) {
      for (let i = fields.length - 1; i >= 0; i--) {
        const field = fields[i];
        if (field.depth !== 'full') continue;
        if (recipe && recipeKeys.has(field.entry.key)) continue;
        fields[i] = { ...field, depth: 'brief' };
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
  header?: Pick<ContextRequest, 'patchName' | 'sourceNote' | 'modeNote' | 'sessionNote' | 'query'>,
): string {
  const lines: string[] = [];
  if (header) {
    lines.push(`patch: ${header.patchName}`);
    lines.push(`source: ${header.sourceNote}`);
    lines.push(`mode: ${header.modeNote}`);
    if (header.sessionNote) {
      lines.push(`session: ${header.sessionNote}`);
    }
    lines.push('');
    if (header.query && isPatchRecipeQuery(header.query)) {
      lines.push(GR55_RECIPE_PLAYBOOK);
      lines.push('');
      const toneField = fields.find((field) => field.entry.fieldKey === 'toneSelect');
      const candidates = toneField?.enumCandidates;
      if (candidates && candidates.length > 0) {
        lines.push(`TONE CANDIDATES: ${candidates.join(' | ')}`);
        lines.push('');
      }
    }
  }

  lines.push('FIELDS:');
  for (const field of fields) {
    if (field.depth !== 'full') continue;
    lines.push(
      `${field.entry.key} | ${field.entry.label} | ${field.value} | ${constraintsOf(field.entry, field.enumCandidates)}`,
    );
  }

  const brief = fields.filter((field) => field.depth === 'brief').slice(0, 40);
  if (brief.length > 0) {
    lines.push('');
    lines.push(SEARCH_VOCABULARY_HINT);
    for (const field of brief) {
      lines.push(`${field.entry.key} (${field.entry.label})`);
    }
  }

  return lines.join('\n');
}
