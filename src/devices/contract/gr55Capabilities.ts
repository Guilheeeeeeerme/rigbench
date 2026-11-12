import type { DeviceCapabilities } from '../../intentions/types';

/**
 * What the GR-55 adapter is willing to claim before a hardware session
 * fills docs/current/capability-matrix.md.
 */
export const GR55_CAPABILITIES: DeviceCapabilities = {
  id: 'gr55',
  persistence: 'explicit-verified-write',
  hardwareConfirmed: false,
  maxSynthLayers: 2,
  hasModeling: true,
  hasNormalSignal: true,
  hasExpression: true,
  hasCtl: true,
  supportsArticulation: false,
  assignSlots: 8,
  gkSets: 10,
  sharedEffects: ['reverb', 'delay', 'chorus'],
  userSlotCount: 297,
};
