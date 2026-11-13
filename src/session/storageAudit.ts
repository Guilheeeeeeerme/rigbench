/** The only browser key the product writes. Interface language, not pedal setup. */
const ALLOWED_STORAGE_KEYS = ['rigbench.locale'] as const;

export function isAllowedStorageKey(key: string): boolean {
  return (ALLOWED_STORAGE_KEYS as readonly string[]).includes(key);
}
