import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RememberedPorts } from './connectionSlice';

export interface SessionPrefsState {
  rememberedPorts: RememberedPorts | null;
  /** Last GR-55 child route segment, e.g. `palco`. */
  lastRoute: string;
  /** DEV only: last connect used FakeGr55 — resume without MIDI ports. */
  preferSimulated: boolean;
}

const LEGACY_PORT_KEY = 'rigbench.gr55.ports';

function readLegacyPorts(): RememberedPorts | null {
  try {
    const stored = JSON.parse(localStorage.getItem(LEGACY_PORT_KEY) ?? '') as {
      input?: string;
      output?: string;
    };
    if (stored.input && stored.output) {
      return { inputId: stored.input, outputId: stored.output };
    }
  } catch {
    // Nothing usable.
  }
  return null;
}

const initialState: SessionPrefsState = {
  rememberedPorts: readLegacyPorts(),
  lastRoute: '',
  preferSimulated: false,
};

const sessionPrefsSlice = createSlice({
  name: 'sessionPrefs',
  initialState,
  reducers: {
    setRememberedPorts(state, action: PayloadAction<RememberedPorts | null>) {
      state.rememberedPorts = action.payload;
    },
    setLastRoute(state, action: PayloadAction<string>) {
      state.lastRoute = action.payload;
    },
    setPreferSimulated(state, action: PayloadAction<boolean>) {
      state.preferSimulated = action.payload;
    },
  },
});

export const { setRememberedPorts, setLastRoute, setPreferSimulated } =
  sessionPrefsSlice.actions;
export const sessionPrefsReducer = sessionPrefsSlice.reducer;
