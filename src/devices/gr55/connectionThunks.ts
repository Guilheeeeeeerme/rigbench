import { requestAccess } from '../../midi/access';
import {
  MidiAbortError,
  MidiSession,
  MidiTimeoutError,
  identify,
  type MidiInputLike,
  type MidiOutputLike,
} from '../../midi/session';
import { RolandGR55SysExConfig } from '../../protocol/RolandDevices';
import type { AppDispatch, RootState } from '../../app/store/store';
import {
  clearProblem,
  setHasAccess,
  setPhase,
  setPorts,
  setProblem,
  setProgress,
  setSelectedInputId,
  setSelectedOutputId,
  type PortChoice,
  type RememberedPorts,
} from '../../app/store/slices/connectionSlice';
import {
  setLastRoute,
  setPreferSimulated,
  setRememberedPorts,
} from '../../app/store/slices/sessionPrefsSlice';
import {
  getLiveConnection,
  getMidiAccess,
  releaseLiveConnection,
  setLiveConnection,
  setMidiAccess,
} from './connectionRuntime';
import { Gr55Editor } from './editor';
import { openSyncCache } from './sync/cache';
import { SyncEngine } from './sync/engine';
import { Gr55System } from './systemState';

const GR55_PORT_NAME = /gr-?55/i;

let connectAttempt = 0;
let identifyAbort: AbortController | undefined;

function portChoices(ports: Iterable<MIDIPort>): PortChoice[] {
  return [...ports].map((port) => ({
    id: port.id,
    name: port.name ?? port.id,
  }));
}

function preferredPortId(ports: PortChoice[]): string {
  const rank = (name: string) => {
    if (GR55_PORT_NAME.test(name) || /roland/i.test(name)) {
      return 0;
    }
    if (/midi through/i.test(name)) {
      return 2;
    }
    return 1;
  };
  return [...ports].sort((a, b) => rank(a.name) - rank(b.name))[0]?.id ?? '';
}

function pickSelection(
  ports: PortChoice[],
  current: string,
  remembered: string | undefined,
): string {
  if (ports.some((port) => port.id === current)) {
    return current;
  }
  if (remembered && ports.some((port) => port.id === remembered)) {
    return remembered;
  }
  return preferredPortId(ports);
}

/** Refresh port lists and selected ids from the current MIDIAccess. */
export function refreshPortsFromAccess(dispatch: AppDispatch, getState: () => RootState): void {
  const access = getMidiAccess();
  if (!access) {
    return;
  }
  const inputs = portChoices(access.inputs.values());
  const outputs = portChoices(access.outputs.values());
  dispatch(setPorts({ inputs, outputs }));
  const remembered = getState().sessionPrefs.rememberedPorts;
  const { selectedInputId, selectedOutputId } = getState().connection;
  dispatch(
    setSelectedInputId(pickSelection(inputs, selectedInputId, remembered?.inputId)),
  );
  dispatch(
    setSelectedOutputId(pickSelection(outputs, selectedOutputId, remembered?.outputId)),
  );
}

export function requestMidiAccess() {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    dispatch(clearProblem());
    dispatch(setPhase('requesting'));
    try {
      const access = await requestAccess();
      setMidiAccess(access);
      dispatch(setHasAccess(true));
      refreshPortsFromAccess(dispatch, getState);
      access.onstatechange = () => {
        refreshPortsFromAccess(dispatch, getState);
      };
      return true;
    } catch {
      setMidiAccess(undefined);
      dispatch(setHasAccess(false));
      dispatch(setProblem('denied'));
      dispatch(setPhase('needsPrompt'));
      return false;
    }
  };
}

export interface ConnectPortsArgs {
  input: MidiInputLike;
  output: MidiOutputLike;
  remember?: RememberedPorts;
}

export function connectWithPorts(args: ConnectPortsArgs) {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    const ticket = ++connectAttempt;
    identifyAbort?.abort();
    identifyAbort = new AbortController();
    releaseLiveConnection();
    dispatch(clearProblem());
    dispatch(setPhase('connecting'));
    dispatch(setProgress(0));

    const stillHere = () => ticket === connectAttempt;
    let session: MidiSession | undefined;

    try {
      const identity = await identify(args.input, args.output, 1500, identifyAbort.signal);
      if (!stillHere()) {
        return false;
      }
      const config = RolandGR55SysExConfig;
      if (
        identity.manufacturerId !== config.manufacturerId ||
        identity.deviceFamily !== config.familyCode
      ) {
        dispatch(setProblem('wrongDevice'));
        dispatch(setPhase('needsPrompt'));
        return false;
      }

      session = new MidiSession(args.input, args.output, config, identity.deviceId);
      const editor = new Gr55Editor(session, () => {
        if (stillHere()) {
          dispatch(setProblem('lost'));
        }
      });
      const sync = new SyncEngine(editor, openSyncCache());
      const system = new Gr55System(session);
      setLiveConnection({ session, editor, sync, system });

      await editor.readSystem();
      if (!stillHere()) {
        return false;
      }
      await editor.readPatch((done) => {
        if (stillHere()) {
          dispatch(setProgress(done));
        }
      });
      if (!stillHere()) {
        return false;
      }
      await editor.readPatchLocation();
      if (!stillHere()) {
        return false;
      }

      if (args.remember) {
        dispatch(setRememberedPorts(args.remember));
        dispatch(setPreferSimulated(false));
      }

      // Slot library sync intentionally not started — pedal config is not cached as SoT.
      void sync;
      dispatch(setPhase('connected'));
      return true;
    } catch (reason) {
      if (getLiveConnection()?.session === session) {
        releaseLiveConnection();
      } else {
        session?.close();
      }
      if (!stillHere()) {
        return false;
      }
      if (reason instanceof MidiAbortError) {
        dispatch(setPhase('needsPrompt'));
        return false;
      }
      dispatch(setProblem(reason instanceof MidiTimeoutError ? 'noReply' : 'lost'));
      dispatch(setPhase('needsPrompt'));
      return false;
    }
  };
}

/** Connect using the currently selected port ids on MIDIAccess. */
export function connectSelectedPorts() {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    const access = getMidiAccess();
    const { selectedInputId, selectedOutputId, inputs, outputs } = getState().connection;
    if (!access) {
      dispatch(setPhase('needsPrompt'));
      return false;
    }
    if (inputs.length === 0 || outputs.length === 0) {
      dispatch(setProblem('noPorts'));
      dispatch(setPhase('needsPrompt'));
      return false;
    }
    const input = [...access.inputs.values()].find((port) => port.id === selectedInputId);
    const output = [...access.outputs.values()].find((port) => port.id === selectedOutputId);
    if (!input || !output) {
      dispatch(setProblem('noPorts'));
      dispatch(setPhase('needsPrompt'));
      return false;
    }
    return dispatch(
      connectWithPorts({
        input,
        output,
        remember: { inputId: input.id, outputId: output.id },
      }),
    );
  };
}

/**
 * After MIDI access: if remembered ports are still present, connect silently.
 * Otherwise leave the UI on the connect prompt.
 */
export function resumeIfPossible() {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    const { phase, hasAccess } = getState().connection;
    const { rememberedPorts, preferSimulated } = getState().sessionPrefs;
    if (getLiveConnection() && phase === 'connected') {
      return true;
    }
    if (phase === 'connecting' || phase === 'requesting') {
      return false;
    }

    if (import.meta.env.DEV && preferSimulated) {
      return dispatch(connectSimulatedPedal());
    }

    const ports = rememberedPorts;
    if (!ports) {
      dispatch(setPhase('needsPrompt'));
      return false;
    }

    if (!hasAccess || !getMidiAccess()) {
      const ok = await dispatch(requestMidiAccess());
      if (!ok) {
        return false;
      }
    } else {
      refreshPortsFromAccess(dispatch, getState);
    }

    const access = getMidiAccess();
    if (!access) {
      dispatch(setPhase('needsPrompt'));
      return false;
    }
    const input = [...access.inputs.values()].find((port) => port.id === ports.inputId);
    const output = [...access.outputs.values()].find((port) => port.id === ports.outputId);
    if (!input || !output) {
      // Stale pair: forget it so the user picks fresh ports.
      dispatch(setRememberedPorts(null));
      dispatch(setPhase('needsPrompt'));
      return false;
    }

    dispatch(setSelectedInputId(input.id));
    dispatch(setSelectedOutputId(output.id));
    return dispatch(
      connectWithPorts({
        input,
        output,
        remember: { inputId: input.id, outputId: output.id },
      }),
    );
  };
}

export function connectSimulatedPedal() {
  return async (dispatch: AppDispatch) => {
    if (!import.meta.env.DEV) {
      return false;
    }
    dispatch(setPreferSimulated(true));
    dispatch(setRememberedPorts(null));
    const { FakeGr55 } = await import('./fakeDevice');
    const pedal = new FakeGr55({ persist: true });
    return dispatch(connectWithPorts({ input: pedal, output: pedal }));
  };
}

export function disconnectPedal() {
  return (dispatch: AppDispatch) => {
    connectAttempt += 1;
    identifyAbort?.abort();
    identifyAbort = undefined;
    releaseLiveConnection();
    dispatch(clearProblem());
    dispatch(setPhase('needsPrompt'));
  };
}

/**
 * Exit the app: drop MIDI, purge connection resume prefs, leave for Home.
 * Does not touch pedal configuration (nothing of that is stored locally).
 */
export function exitToHome() {
  return async (dispatch: AppDispatch) => {
    dispatch(disconnectPedal());
    dispatch(setRememberedPorts(null));
    dispatch(setPreferSimulated(false));
    dispatch(setLastRoute(''));
    if (import.meta.env.DEV) {
      const { clearFakeGr55Memory } = await import('./fakeDevice');
      clearFakeGr55Memory();
    }
  };
}
