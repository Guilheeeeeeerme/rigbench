export type MaestroKind = 'edit' | 'explain' | 'search';

export interface ChangeItem {
  key: string;
  value: string | number | boolean;
  why?: string;
}

export interface MaestroReply {
  kind: MaestroKind;
  intent?: string;
  reply: string;
  changes?: ChangeItem[];
  search?: string;
  /** Slot label like `U14:2` when the user asked to load a patch. */
  loadSlot?: string;
}

export type ValidatedAction = 'accept' | 'clamp' | 'reject';

export interface ValidatedItem {
  change: ChangeItem;
  entry: import('./fieldRegistry').RegistryEntry | null;
  action: ValidatedAction;
  current: string;
  proposed: string;
  /** Coerced value ready for Gr55Editor.write when accepted/clamped. */
  coerced?: string | number | boolean;
  reason?: string;
}

export interface ValidatedPlan {
  accepted: ValidatedItem[];
  clamped: ValidatedItem[];
  rejected: ValidatedItem[];
}

const KINDS = new Set<string>(['edit', 'explain', 'search']);

export function isMaestroReply(value: unknown): value is MaestroReply {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.kind !== 'string' || !KINDS.has(obj.kind)) return false;
  if (typeof obj.reply !== 'string') return false;
  if (obj.intent !== undefined && typeof obj.intent !== 'string') return false;
  if (obj.search !== undefined && typeof obj.search !== 'string') return false;
  if (obj.loadSlot !== undefined && typeof obj.loadSlot !== 'string') return false;
  if (obj.changes !== undefined) {
    if (!Array.isArray(obj.changes)) return false;
    for (const item of obj.changes) {
      if (!item || typeof item !== 'object') return false;
      const change = item as Record<string, unknown>;
      if (typeof change.key !== 'string') return false;
      const v = change.value;
      if (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean') {
        return false;
      }
      if (change.why !== undefined && typeof change.why !== 'string') return false;
    }
  }
  return true;
}
