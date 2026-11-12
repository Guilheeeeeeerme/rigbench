import type { DeviceCapabilities, MusicalIntention } from './types';

/** Whether this device can attempt the intention. Says nothing about the current patch. */
export function intentionSupported(
  capabilities: DeviceCapabilities,
  intention: MusicalIntention,
): boolean {
  switch (intention.kind) {
    case 'instrument':
    case 'calibration':
      return capabilities.gkSets > 0;
    case 'mode':
      return capabilities.hasNormalSignal;
    case 'layer':
    case 'clear-layer':
      return intention.slot <= capabilities.maxSynthLayers;
    case 'effect':
      return capabilities.sharedEffects.length > 0;
    case 'recipe':
      if (intention.id === 'nylon-harmonica-exp') {
        return (
          capabilities.hasNormalSignal &&
          capabilities.hasExpression &&
          capabilities.maxSynthLayers >= 1
        );
      }
      if (intention.id === 'nylon-piano-strings-ctl') {
        return (
          capabilities.hasNormalSignal &&
          capabilities.hasCtl &&
          capabilities.maxSynthLayers >= 2
        );
      }
      return capabilities.hasNormalSignal && capabilities.maxSynthLayers >= 1;
    default:
      return false;
  }
}
