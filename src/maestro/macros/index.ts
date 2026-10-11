export { applyMacroOption } from './apply';
export type { ApplyOutcome, ApplyTargets } from './apply';
export { matchGroup } from './match';
export { findGroup, findOption, groupsForSession, MACRO_GROUPS } from './registry';
export { resolveSystemRef } from './systemRefs';
export type {
  LibraryWrite,
  MacroGroup,
  MacroGroupKind,
  MacroOption,
  MacroWrite,
  MatchResult,
  PatchWrite,
  SystemWrite,
} from './types';
