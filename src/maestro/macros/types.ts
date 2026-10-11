import type { SessionId } from '../session';

/** Locale-free patch key matching `fieldRegistry` (`pageId/section/field`). */
export type PatchWrite = {
  domain: 'patch';
  key: string;
  value: unknown;
};

/**
 * Pedal-wide stage write. `ref` forms:
 * - `common.outputSelect`
 * - `pedals.ctlFunction`
 * - `gkSet.active.puType` (active = current gkSetSelect)
 * - `gkSet.3.scale` (set 1–10)
 */
export type SystemWrite = {
  domain: 'system';
  ref: string;
  value: unknown;
};

/** Library browse context only — never SysEx until the user loads a slot. */
export type LibraryWrite = {
  domain: 'library';
  action: 'filter';
  style: 'lead' | 'rhythm' | 'other' | 'user';
};

export type MacroWrite = PatchWrite | SystemWrite | LibraryWrite;

export type MacroGroupKind = 'pills' | 'actions' | 'rename' | 'mode';

export interface MacroOption {
  id: string;
  /** Copy key under `studio.options.<id>` when present; else group-local. */
  labelEn: string;
  labelPt: string;
  writes: readonly MacroWrite[];
  /**
   * When true, selecting shows Advanced / no-op messaging instead of applying.
   * Used for “Keep & edit” and unfinished templates.
   */
  opensAdvanced?: boolean;
}

export interface MacroGroup {
  session: SessionId;
  id: string;
  kind: MacroGroupKind;
  titleEn: string;
  titlePt: string;
  options: readonly MacroOption[];
  /**
   * When false, pills are listed but apply is a no-op stub (UI still selectable
   * for scaffolding). Prefer real writes for priority groups.
   */
  implemented: boolean;
}

export type MatchResult =
  | { kind: 'option'; optionId: string; score: number; total: number }
  | { kind: 'custom' }
  | { kind: 'unknown' };
