import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = join(fileURLToPath(new URL('../..', import.meta.url)));

/** Patterns that look like real Gemini / Google API keys. */
const FORBIDDEN = [/AIza[\w-]{20,}/, /AQ\./];

const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  'coverage',
  '.cursor',
  'research_notes',
  'reports',
]);

const TEXT_EXT = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.css',
  '.html',
  '.txt',
  '.yml',
  '.yaml',
  '.toml',
  '.env',
  '.svg',
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      walk(path, out);
      continue;
    }
    const ext = name.includes('.') ? `.${name.split('.').pop()}` : '';
    if (TEXT_EXT.has(ext) || name === 'Dockerfile' || name.startsWith('.env')) {
      out.push(path);
    }
  }
  return out;
}

describe('secrets guard', () => {
  it('rejects Gemini/Google key-shaped strings anywhere in the repo', () => {
    const hits: string[] = [];
    for (const file of walk(ROOT)) {
      let text: string;
      try {
        text = readFileSync(file, 'utf8');
      } catch {
        continue;
      }
      for (const pattern of FORBIDDEN) {
        if (pattern.test(text)) {
          hits.push(`${relative(ROOT, file)} ~ ${pattern}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });
});
