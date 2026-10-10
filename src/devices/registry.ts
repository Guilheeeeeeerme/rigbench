export interface DeviceEntry {
  /** Also the key of the device's name and kind in the copy dictionaries. */
  id: 'gr55' | 'vg99' | 'gt10';
  /** Route of the device's editor. A device without one is listed as coming soon. */
  route?: string;
}

export const devices: readonly DeviceEntry[] = [
  { id: 'gr55', route: '/gr55' },
  { id: 'vg99' },
  { id: 'gt10' },
];
