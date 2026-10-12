import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type ConnectionPhase =
  | 'idle'
  | 'requesting'
  | 'connecting'
  | 'connected'
  | 'needsPrompt';

export type ConnectionProblem =
  | 'denied'
  | 'noReply'
  | 'wrongDevice'
  | 'lost'
  | 'noPorts'
  | null;

export interface PortChoice {
  id: string;
  name: string;
}

export interface RememberedPorts {
  inputId: string;
  outputId: string;
}

export interface ConnectionState {
  phase: ConnectionPhase;
  /** Patch blocks read so far while connecting; 0 while identifying. */
  progress: number;
  hasAccess: boolean;
  inputs: PortChoice[];
  outputs: PortChoice[];
  selectedInputId: string;
  selectedOutputId: string;
  problem: ConnectionProblem;
}

export const initialConnectionState: ConnectionState = {
  phase: 'idle',
  progress: 0,
  hasAccess: false,
  inputs: [],
  outputs: [],
  selectedInputId: '',
  selectedOutputId: '',
  problem: null,
};

const connectionSlice = createSlice({
  name: 'connection',
  initialState: initialConnectionState,
  reducers: {
    setPhase(state, action: PayloadAction<ConnectionPhase>) {
      state.phase = action.payload;
      if (action.payload === 'connecting') {
        state.progress = 0;
      }
    },
    setProgress(state, action: PayloadAction<number>) {
      state.progress = action.payload;
    },
    setHasAccess(state, action: PayloadAction<boolean>) {
      state.hasAccess = action.payload;
    },
    setPorts(
      state,
      action: PayloadAction<{ inputs: PortChoice[]; outputs: PortChoice[] }>,
    ) {
      state.inputs = action.payload.inputs;
      state.outputs = action.payload.outputs;
    },
    setSelectedInputId(state, action: PayloadAction<string>) {
      state.selectedInputId = action.payload;
    },
    setSelectedOutputId(state, action: PayloadAction<string>) {
      state.selectedOutputId = action.payload;
    },
    setProblem(state, action: PayloadAction<ConnectionProblem>) {
      state.problem = action.payload;
    },
    clearProblem(state) {
      state.problem = null;
    },
  },
});

export const {
  setPhase,
  setProgress,
  setHasAccess,
  setPorts,
  setSelectedInputId,
  setSelectedOutputId,
  setProblem,
  clearProblem,
} = connectionSlice.actions;

export const connectionReducer = connectionSlice.reducer;
