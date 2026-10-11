import { createContext, createElement, useContext, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { en } from './en';
import { ptBR } from './pt-BR';

/** The shape every dictionary has. English is the source of truth. */
export type Copy = typeof en;

export type Locale = 'en' | 'pt-BR';

export const LOCALES: readonly Locale[] = ['en', 'pt-BR'];

const dictionaries: Record<Locale, Copy> = { en, 'pt-BR': ptBR };

type Leaf = string | ((...args: never[]) => string);

type Paths<T> = {
  [K in keyof T & string]: T[K] extends Leaf ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

type At<T, P extends string> = P extends `${infer Head}.${infer Rest}`
  ? Head extends keyof T
    ? At<T[Head], Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never;

/** Dotted path of one string in the dictionary, such as `library.title`. */
export type CopyKey = Paths<Copy>;

/** What a key's text needs filled in: nothing for plain strings. */
export type CopyParams<K extends CopyKey> =
  At<Copy, K> extends (...args: infer Args) => string ? Args : [];

export type Translate = <K extends CopyKey>(key: K, ...params: CopyParams<K>) => string;

const LOCALE_KEY = 'rigbench.locale';

/** Picks the dictionary closest to a browser language tag; English when none fits. */
export function matchLocale(tag: string | undefined | null): Locale {
  return tag?.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en';
}

function initialLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_KEY);
    if (stored && (LOCALES as readonly string[]).includes(stored)) {
      return stored as Locale;
    }
  } catch {
    // No storage (private mode, tests): fall through to the browser language.
  }
  return matchLocale(typeof navigator === 'undefined' ? undefined : navigator.language);
}

let current: Locale = initialLocale();
const listeners = new Set<() => void>();

function markDocument(locale: Locale): void {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale;
  }
}

markDocument(current);

export function getLocale(): Locale {
  return current;
}

export function setLocale(locale: Locale): void {
  if (locale === current) {
    return;
  }
  current = locale;
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    // The choice still holds for this visit.
  }
  markDocument(locale);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function lookup(dictionary: Copy, key: string): unknown {
  let node: unknown = dictionary;
  for (const part of key.split('.')) {
    node = (node as Record<string, unknown> | undefined)?.[part];
  }
  return node;
}

function translator(locale: Locale): Translate {
  return ((key: string, ...params: unknown[]) => {
    const entry = lookup(dictionaries[locale], key) ?? lookup(en, key);
    if (typeof entry === 'function') {
      return (entry as (...args: unknown[]) => string)(...params);
    }
    return typeof entry === 'string' ? entry : key;
  }) as Translate;
}

const translators: Record<Locale, Translate> = {
  en: translator('en'),
  'pt-BR': translator('pt-BR'),
};

/** Text in the current language. Outside React; components use `useT` so they follow a switch. */
export const t: Translate = ((key: CopyKey, ...params: unknown[]) =>
  (translators[current] as (key: CopyKey, ...params: unknown[]) => string)(
    key,
    ...params,
  )) as Translate;

const LocaleContext = createContext<Locale>(current);

/** Puts the chosen language above the app, so every screen follows a switch without a reload. */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getLocale, getLocale);
  return createElement(LocaleContext.Provider, { value: locale }, children);
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** The curated lists of pedal values that have translated labels. */
export type EnumGroup = keyof Copy['enums'];

/** A pedal value in the given language; the pedal's own wording when there is none. */
export function enumLabelIn(locale: Locale, group: EnumGroup, raw: string | number): string {
  const labels = dictionaries[locale].enums[group] as Record<string, string>;
  return labels[String(raw)] ?? String(raw);
}

/** Labels for a curated list of pedal values, following the chosen language. */
export function useEnumLabel(): (group: EnumGroup, raw: string | number) => string {
  const locale = useContext(LocaleContext);
  return (group, raw) => enumLabelIn(locale, group, raw);
}

/** The translate function of the current language; its identity changes with the language. */
export function useT(): Translate {
  return translators[useContext(LocaleContext)];
}
