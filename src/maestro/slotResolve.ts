import type { GkMode } from '../devices/gr55/editor';
import { slotsOfMode } from '../devices/gr55/slots';
import type { LoadSlotAsk } from './orchestrator';

/**
 * Resolve model/user slot labels (`USER 01-2`, `U14:2`, `U14-2`, `14-2`) against slotsOfMode.
 */
export function resolveSlotLabel(mode: GkMode, raw: string): LoadSlotAsk | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const slots = slotsOfMode(mode);

  const exact = slots.find((slot) => slot.label.toLowerCase() === trimmed.toLowerCase());
  if (exact) {
    return {
      label: exact.label,
      bankMsb: exact.bankMsb,
      programChange: exact.programChange,
    };
  }

  const match = trimmed.match(/^(?:user\s*)?u?(\d{1,3})\s*[:-]\s*(\d+)$/i);
  if (!match) return undefined;
  const label = `${match[1].padStart(2, '0')}-${match[2]}`;
  const hit = slots.find((slot) => slot.label === label);
  if (!hit) return undefined;
  return {
    label: hit.label,
    bankMsb: hit.bankMsb,
    programChange: hit.programChange,
  };
}
