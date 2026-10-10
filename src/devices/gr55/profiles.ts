import { t } from '../../copy';

/** Instrument presets the musician picks once; these live in the app, not the pedal. */
export interface InstrumentProfile {
  id: 'guitar-gk' | 'acoustic-piezo' | 'bass-gk';
}

const PROFILE_KEY = 'rigbench.gr55.profile';

export const PROFILE_PRESETS: readonly InstrumentProfile[] = [
  { id: 'guitar-gk' },
  { id: 'acoustic-piezo' },
  { id: 'bass-gk' },
];

export function profileId(id: string): InstrumentProfile['id'] {
  return PROFILE_PRESETS.find((preset) => preset.id === id)?.id ?? 'guitar-gk';
}

export function loadProfile(): InstrumentProfile {
  try {
    const stored = localStorage.getItem(PROFILE_KEY);
    if (stored) {
      return { id: profileId(JSON.parse(stored).id) };
    }
  } catch {
    // Not parsed, not a profile: the default stands.
  }
  return { id: 'guitar-gk' };
}

export function saveProfile(profile: InstrumentProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function profileName(profile: InstrumentProfile): string {
  return t(`device.profiles.${profile.id}`);
}

/** The mode the pedal must be in for this profile's patch names to line up. */
export function profileMode(profile: InstrumentProfile): 'GUITAR' | 'BASS' {
  return profile.id === 'bass-gk' ? 'BASS' : 'GUITAR';
}
