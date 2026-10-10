import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { en } from '../../copy/en';
import { requestAccess } from '../../midi/access';
import { MidiSession, MidiTimeoutError, identify } from '../../midi/session';
import type { MidiInputLike, MidiOutputLike } from '../../midi/session';
import { RolandGR55SysExConfig } from '../../protocol/RolandDevices';
import { Workspace } from './Workspace';
import { Gr55Editor } from './editor';
import { PATCH_BLOCKS } from './patchLayout';

const GR55_PORT_NAME = /gr-?55/i;

interface Connection {
  session: MidiSession;
  editor: Gr55Editor;
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'connecting'; done: number }
  | { kind: 'connected'; connection: Connection };

function preferredPort<T extends MIDIPort>(ports: T[]): string {
  return (ports.find((port) => GR55_PORT_NAME.test(port.name ?? '')) ?? ports[0])?.id ?? '';
}

export default function Gr55Screen() {
  const [access, setAccess] = useState<MIDIAccess>();
  const [inputs, setInputs] = useState<MIDIInput[]>([]);
  const [outputs, setOutputs] = useState<MIDIOutput[]>([]);
  const [inputId, setInputId] = useState('');
  const [outputId, setOutputId] = useState('');
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [problem, setProblem] = useState<string>();
  const [error, setError] = useState<unknown>();
  const live = useRef<Connection | undefined>(undefined);

  const disconnect = () => {
    live.current?.editor.dispose();
    live.current?.session.close();
    live.current = undefined;
    setError(undefined);
    setPhase({ kind: 'idle' });
  };

  // Leaving the screen releases the ports.
  useEffect(
    () => () => {
      live.current?.editor.dispose();
      live.current?.session.close();
    },
    [],
  );

  useEffect(() => {
    if (!access) {
      return;
    }
    const refresh = () => {
      const nextInputs = [...access.inputs.values()];
      const nextOutputs = [...access.outputs.values()];
      setInputs(nextInputs);
      setOutputs(nextOutputs);
      setInputId((current) =>
        nextInputs.some((port) => port.id === current) ? current : preferredPort(nextInputs),
      );
      setOutputId((current) =>
        nextOutputs.some((port) => port.id === current) ? current : preferredPort(nextOutputs),
      );
    };
    refresh();
    access.addEventListener('statechange', refresh);
    return () => access.removeEventListener('statechange', refresh);
  }, [access]);

  const allow = async () => {
    setProblem(undefined);
    try {
      setAccess(await requestAccess());
    } catch {
      setProblem(en.connection.denied);
    }
  };

  const connect = async (input: MidiInputLike, output: MidiOutputLike) => {
    setProblem(undefined);
    setError(undefined);
    setPhase({ kind: 'connecting', done: 0 });
    let session: MidiSession | undefined;
    try {
      const identity = await identify(input, output);
      const config = RolandGR55SysExConfig;
      if (
        identity.manufacturerId !== config.manufacturerId ||
        identity.deviceFamily !== config.familyCode
      ) {
        setProblem(en.connection.wrongDevice);
        setPhase({ kind: 'idle' });
        return;
      }
      session = new MidiSession(input, output, config, identity.deviceId);
      const editor = new Gr55Editor(session, setError);
      await editor.readSystem();
      await editor.readPatch((done) => setPhase({ kind: 'connecting', done }));
      const connection = { session, editor };
      live.current = connection;
      setPhase({ kind: 'connected', connection });
    } catch (reason) {
      session?.close();
      setProblem(reason instanceof MidiTimeoutError ? en.connection.noReply : en.connection.lost);
      setPhase({ kind: 'idle' });
    }
  };

  const connectSelected = () => {
    const input = inputs.find((port) => port.id === inputId);
    const output = outputs.find((port) => port.id === outputId);
    if (input && output) {
      void connect(input, output);
    }
  };

  const connectSimulated = async () => {
    if (!import.meta.env.DEV) {
      return;
    }
    const { FakeGr55 } = await import('./fakeDevice');
    const pedal = new FakeGr55();
    void connect(pedal, pedal);
  };

  if (phase.kind === 'connected') {
    return (
      <Workspace
        editor={phase.connection.editor}
        error={error}
        onError={setError}
        onDisconnect={disconnect}
      />
    );
  }

  const connecting = phase.kind === 'connecting';
  return (
    <main className="connect">
      <Link className="brand" to="/">
        {en.app.name}
      </Link>
      <h1>{en.connection.title}</h1>
      <p>{en.connection.intro}</p>

      {!access ? (
        <button type="button" className="primary" onClick={() => void allow()}>
          {en.connection.allow}
        </button>
      ) : inputs.length === 0 || outputs.length === 0 ? (
        <p className="hint">{en.connection.noPorts}</p>
      ) : (
        <div className="ports">
          <label>
            {en.connection.input}
            <select
              value={inputId}
              disabled={connecting}
              onChange={(event) => setInputId(event.target.value)}
            >
              {inputs.map((port) => (
                <option key={port.id} value={port.id}>
                  {port.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {en.connection.output}
            <select
              value={outputId}
              disabled={connecting}
              onChange={(event) => setOutputId(event.target.value)}
            >
              {outputs.map((port) => (
                <option key={port.id} value={port.id}>
                  {port.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="primary" disabled={connecting} onClick={connectSelected}>
            {en.connection.connect}
          </button>
        </div>
      )}

      {connecting && (
        <p className="status" role="status">
          {phase.done === 0
            ? en.connection.connecting
            : en.gr55.reading(phase.done, PATCH_BLOCKS.length)}
        </p>
      )}
      {problem && (
        <p className="error" role="alert">
          {problem}
        </p>
      )}

      {import.meta.env.DEV && (
        <p className="hint">
          <button type="button" disabled={connecting} onClick={() => void connectSimulated()}>
            {en.connection.simulate}
          </button>
        </p>
      )}
    </main>
  );
}
