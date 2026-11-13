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
} from '../../app/store/slices/connectionSlice';
import { acquireWriterLock, releaseWriterLock } from '../../session/tabLock';
import {
  getLiveConnection,
  getMidiAccess,
  releaseLiveConnection,
  setLiveConnection,
  setMidiAccess,
} from './connectionRuntime';
import { Gr55Editor } from './editor';
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

function pickSelection(ports: PortChoice[], current: string): string {
  if (ports.some((port) => port.id === current)) {
    return current;
  }
  return preferredPortId(ports);
}

/** Refresh port lists and selected ids from the current MIDIAccess. */
function refreshPortsFromAccess(dispatch: AppDispatch, getState: () => RootState): void {
  const access = getMidiAccess();
  if (!access) {
    return;
  }
  const inputs = portChoices(access.inputs.values());
  const outputs = portChoices(access.outputs.values());
  dispatch(setPorts({ inputs, outputs }));
  const { selectedInputId, selectedOutputId } = getState().connection;
  dispatch(setSelectedInputId(pickSelection(inputs, selectedInputId)));
  dispatch(setSelectedOutputId(pickSelection(outputs, selectedOutputId)));
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
      dispatch(setPhase('needsPrompt'));
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
}

function connectWithPorts(args: ConnectPortsArgs) {
  return async (dispatch: AppDispatch) => {
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

      const lock = await acquireWriterLock();
      if (!stillHere()) {
        releaseWriterLock();
        return false;
      }
      if (lock === 'blocked') {
        dispatch(setProblem('otherTab'));
        dispatch(setPhase('needsPrompt'));
        return false;
      }

      session = new MidiSession(args.input, args.output, config, identity.deviceId);
      const editor = new Gr55Editor(session, () => {
        if (stillHere()) {
          dispatch(setProblem('lost'));
        }
      });
      const system = new Gr55System(session);
      setLiveConnection({ session, editor, system });

      await editor.readSystem();
      if (!stillHere()) {
        return false;
      }
      await system.load();
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
    return dispatch(connectWithPorts({ input, output }));
  };
}

export function connectSimulatedPedal() {
  return async (dispatch: AppDispatch) => {
    if (!import.meta.env.DEV) {
      return false;
    }
    const { FakeGr55 } = await import('./fakeDevice');
    const pedal = new FakeGr55();
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
  return (dispatch: AppDispatch) => {
    dispatch(disconnectPedal());
  };
}
