/** PT/EN musician words → English substrings that appear in GR-55 PCM tone names. */
const TONE_SYNONYMS: readonly { needles: readonly string[]; prefer: readonly string[] }[] = [
  {
    needles: ['metal', 'metais', 'brass', 'trompa', 'trompete', 'horn', 'sopro'],
    prefer: ['Brass', 'Horn', 'Trumpet', 'Trombone', 'Sax'],
  },
  {
    needles: ['gaita', 'harmonica', 'harmônica', 'acordeao', 'acordeão', 'accordion'],
    prefer: ['Harmonica', 'Accordion', 'Bandoneon'],
  },
  {
    needles: ['cumbia', 'teclado', 'keyboard', 'organ', 'órgao', 'orgao', 'synth lead'],
    prefer: ['Accordion', 'Organ', 'Lead', 'Saw Lead', 'Square Lead'],
  },
  {
    needles: ['piano'],
    prefer: ['Piano', 'E.Piano', 'Grand'],
  },
  {
    needles: ['strings', 'cordas', 'violino', 'pad'],
    prefer: ['Strings', 'Violin', 'Pad', 'Soft Pad'],
  },
];

function unique(labels: readonly string[]): string[] {
  return [...new Set(labels)];
}

/** Expand a free-text query into tone-name substrings to try. */
export function toneNeedlesOf(query: string): string[] {
  const lower = query.toLowerCase();
  const needles: string[] = [];
  for (const group of TONE_SYNONYMS) {
    if (group.needles.some((needle) => lower.includes(needle))) {
      needles.push(...group.prefer);
    }
  }
  for (const token of lower.split(/[^a-z0-9.]+/i)) {
    if (token.length >= 3) needles.push(token);
  }
  return unique(needles);
}

/**
 * Rank PCM tone labels that match the query against the pedal catalog
 * (same names as `GR-55_PCM_Tone_List.pdf` / `RolandGR55ToneMap`).
 */
export function matchPcmTones(query: string, labels: readonly string[], limit = 24): string[] {
  const needles = toneNeedlesOf(query).map((needle) => needle.toLowerCase());
  if (needles.length === 0) return [];

  const scored: { label: string; score: number }[] = [];
  for (const label of labels) {
    const hay = label.toLowerCase();
    let score = 0;
    for (const needle of needles) {
      if (hay === needle) score += 100;
      else if (hay.startsWith(needle)) score += 40;
      else if (hay.includes(needle)) score += 20;
    }
    if (score > 0) scored.push({ label, score });
  }
  scored.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
  return scored.slice(0, limit).map((item) => item.label);
}
