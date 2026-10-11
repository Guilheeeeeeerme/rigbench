import { scopeOf } from '../devices/gr55/changeTracking';
import type { RegistryEntry } from './fieldRegistry';
import type { SessionId } from './session';

export type PolicyAction =
  'changePlan' | 'loadSlot' | 'writeSlot' | 'writeSystem' | 'factoryReset' | 'stageSystemPlan';

export type PolicyDecision = 'allow' | 'ask' | 'deny';

export interface PolicyContext {
  route?: string;
  stageLive: boolean;
  /** Active Studio session when known; gates cross-domain writes. */
  session?: SessionId;
}

/**
 * Single source of truth for what Maestro may do. Deny is final — no confirm dialog.
 *
 * - `writeSystem` = direct SYSTEM apply → always deny
 * - `stageSystemPlan` = queue into Gr55System staging → ask (same ApplyBar confirm)
 */
export function decide(
  entry: RegistryEntry | null,
  action: PolicyAction,
  ctx: PolicyContext,
): PolicyDecision {
  if (ctx.stageLive) return 'deny';
  if (action === 'writeSlot' || action === 'writeSystem' || action === 'factoryReset') {
    return 'deny';
  }
  if (action === 'stageSystemPlan') {
    if (ctx.session === 'patch' || ctx.session === 'library') return 'deny';
    return 'ask';
  }
  if (action === 'loadSlot') {
    if (ctx.session === 'system' || ctx.session === 'patch') return 'deny';
    return 'ask';
  }
  if (action === 'changePlan') {
    if (ctx.session === 'system' || ctx.session === 'library') return 'deny';
    if (!entry) return 'deny';
    if (scopeOf(entry.ref.address) !== 'working-copy') return 'deny';
    return 'allow';
  }
  return 'deny';
}
