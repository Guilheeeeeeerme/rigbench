import { scopeOf } from '../devices/gr55/changeTracking';
import type { RegistryEntry } from './fieldRegistry';
import type { SessionId } from './session';

export type PolicyAction =
  | 'changePlan'
  | 'loadSlot'
  | 'writeSlot'
  | 'writeSystem'
  | 'factoryReset'
  | 'stageSystemPlan';

export type PolicyDecision = 'allow' | 'ask' | 'deny';

export interface PolicyContext {
  route?: string;
  /** @deprecated Always false in the two-page app; kept for call-site compatibility. */
  stageLive: boolean;
  /** Active page scope: bank | system. */
  session?: SessionId;
}

/**
 * What Maestro may do. Deny is final.
 *
 * Bank page: working-copy field edits + ask to switch any patch (whole bank set).
 * Global page: system immediate writes.
 */
export function decide(
  entry: RegistryEntry | null,
  action: PolicyAction,
  ctx: PolicyContext,
): PolicyDecision {
  if (action === 'writeSlot' || action === 'factoryReset') {
    return 'deny';
  }
  if (action === 'writeSystem' || action === 'stageSystemPlan') {
    return ctx.session === 'system' ? 'allow' : 'deny';
  }
  if (action === 'loadSlot') {
    // Bank chat may move across the three keys (and other slots) with confirm.
    if (ctx.session === 'bank' || ctx.session === 'library') return 'ask';
    return 'deny';
  }
  if (action === 'changePlan') {
    if (ctx.session === 'system' || ctx.session === 'library') return 'deny';
    if (!entry) return 'deny';
    if (scopeOf(entry.ref.address) !== 'working-copy') return 'deny';
    // bank and patch both edit the sounding temporary patch.
    return 'allow';
  }
  return 'deny';
}
