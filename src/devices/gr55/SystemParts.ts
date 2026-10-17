import { createContext, useContext } from 'react';
import type { Gr55System } from './systemState';

const SystemContext = createContext<Gr55System | undefined>(undefined);

/** Holds the pedal-wide settings object of the connected pedal for the workspace. */
export const SystemProvider = SystemContext.Provider;

/** The pedal-wide settings of the connected pedal. Reads and writes are immediate (DT1). */
export function useSystem(): Gr55System {
  const system = useContext(SystemContext);
  if (!system) {
    throw new Error('useSystem needs a connected pedal above it');
  }
  return system;
}
