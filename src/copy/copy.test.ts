import { afterEach, describe, expect, it } from 'vitest';
import { en } from './en';
import { ptBR } from './pt-BR';
import { getLocale, localeFromStorage, setLocale, t } from './index';

/** Every leaf of a dictionary as `path → kind`, where a function's kind carries its arity. */
function shape(node: unknown, path = '', out = new Map<string, string>()): Map<string, string> {
  if (typeof node === 'function') {
    out.set(path, `function/${node.length}`);
  } else if (typeof node === 'string') {
    out.set(path, 'string');
  } else {
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      shape(value, path ? `${path}.${key}` : key, out);
    }
  }
  return out;
}

describe('copy dictionaries', () => {
  const source = shape(en);
  const translated = shape(ptBR);

  it('pt-BR has every key of en', () => {
    expect([...source.keys()].filter((key) => !translated.has(key))).toEqual([]);
  });

  it('pt-BR has no key en lacks', () => {
    expect([...translated.keys()].filter((key) => !source.has(key))).toEqual([]);
  });

  it('each key is the same kind of entry in both, with the same parameters', () => {
    const mismatched = [...source].filter(([key, kind]) => translated.get(key) !== kind);
    expect(mismatched.map(([key]) => key)).toEqual([]);
  });

  it('no entry is left empty', () => {
    const empty = (dictionary: unknown) =>
      [...shape(dictionary)].filter(
        ([key, kind]) =>
          kind === 'string' &&
          !(key
            .split('.')
            .reduce<unknown>(
              (node, part) => (node as Record<string, unknown>)[part],
              dictionary,
            ) as string),
      );
    expect(empty(en)).toEqual([]);
    expect(empty(ptBR)).toEqual([]);
  });
});

describe('t', () => {
  const initial = getLocale();
  afterEach(() => setLocale(initial));

  it('follows the chosen language without a reload', () => {
    setLocale('en');
    expect(t('home.title')).toBe('Pick your device');
    setLocale('pt-BR');
    expect(t('home.title')).toBe('Escolha seu dispositivo');
  });

  it('fills parameters and pluralises per language', () => {
    setLocale('en');
    expect(t('gr55.workspace.unsavedChanges', 1)).toBe('1 unsaved change');
    setLocale('pt-BR');
    expect(t('gr55.workspace.unsavedChanges', 1)).toBe('1 alteração não gravada');
    expect(t('gr55.workspace.unsavedChanges', 3)).toBe('3 alterações não gravadas');
  });

  it('opens in Brazilian Portuguese unless a stored choice says otherwise', () => {
    expect(localeFromStorage(null)).toBe('pt-BR');
    expect(localeFromStorage(undefined)).toBe('pt-BR');
    expect(localeFromStorage('')).toBe('pt-BR');
    expect(localeFromStorage('en-US')).toBe('pt-BR');
    expect(localeFromStorage('pt-BR')).toBe('pt-BR');
    expect(localeFromStorage('en')).toBe('en');
  });
});
