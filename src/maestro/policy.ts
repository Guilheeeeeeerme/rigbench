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
  /** Active page scope: patch | system. */
  session?: SessionId;
}

/**
 * What Maestro may do. Deny is final.
 *
 * Patch page: working-copy field edits only.
 * Global page: system macros / stageSystemPlan path (immediate write via system host).
 * Never writeSlot / factoryReset.
 */
export function decide(
  entry: RegistryEntry | null,
  action: PolicyAction,
  ctx: PolicyContext,
): PolicyDecision {
  if (action === 'writeSlot' || action === 'factoryReset') {
    return 'deny';
  }
  // Direct SYSTEM DT1 is allowed on the Global page (immediate apply + snapshot).
  if (action === 'writeSystem') {
    return ctx.session === 'system' ? 'allow' : 'deny';
  }
  if (action === 'stageSystemPlan') {
    return ctx.session === 'system' ? 'allow' : 'deny';
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
