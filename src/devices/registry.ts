import { en } from '../copy/en';

export interface DeviceEntry {
  id: string;
  name: string;
  kind: string;
  /** Route of the device's editor. A device without one is listed as coming soon. */
  route?: string;
}

export const devices: readonly DeviceEntry[] = [
  { id: 'gr55', ...en.devices.gr55, route: '/gr55' },
  { id: 'vg99', ...en.devices.vg99 },
  { id: 'gt10', ...en.devices.gt10 },
];
