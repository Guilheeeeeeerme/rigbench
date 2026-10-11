import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { useT } from '../../copy';
import { requestAccess } from '../../midi/access';
import { MidiAbortError, MidiSession, MidiTimeoutError, identify } from '../../midi/session';
import type { MidiInputLike, MidiOutputLike } from '../../midi/session';
import { RolandGR55SysExConfig } from '../../protocol/RolandDevices';
import { Library } from './Library';
import { Stage } from './Stage';
import { Canvas } from './Canvas';
import { DeviceScreen } from './DeviceScreen';
import { Workspace } from './Workspace';
import { Gr55Editor } from './editor';
import {
  connectRoute,
  deviceRoute,
  gkRoute,
  libraryRoute,
  setlistRoute,
  setupRoute,
  stageRoute,
} from './routes';
import { SetlistScreen } from './SetlistScreen';
import { GkSetsScreen } from './GkSets';
import { loadSetup } from './setupState';
import { SystemProvider } from './SystemParts';
import { Gr55System } from './systemState';
import { Wizard } from './Wizard';
import { PATCH_BLOCKS } from './patchLayout';
import { DiscardNotice } from './DiscardNotice';
import { openSyncCache } from './sync/cache';
import { SyncEngine } from './sync/engine';
import { SyncBadge, SyncProvider } from './sync/SyncBadge';

const PORT_MEMORY = 'rigbench.gr55.ports';

interface RememberedPorts {
  input: string;
  output: string;
}

function readRememberedPorts(): RememberedPorts | undefined {
  try {
    const stored = JSON.parse(localStorage.getItem(PORT_MEMORY) ?? '') as RememberedPorts;
    return stored.input && stored.output ? stored : undefined;
  } catch {
    return undefined;
  }
}

const GR55_PORT_NAME = /gr-?55/i;

interface Connection {
  session: MidiSession;
  editor: Gr55Editor;
  sync: SyncEngine;
  system: Gr55System;
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'connecting'; done: number }
  | { kind: 'connected'; connection: Connection };

function preferredPort<T extends MIDIPort>(ports: T[]): string {
  return (ports.find((port) => GR55_PORT_NAME.test(port.name ?? '')) ?? ports[0])?.id ?? '';
}

export default function Gr55Screen() {
  const t = useT();
  const [access, setAccess] = useState<MIDIAccess>();
  const [inputs, setInputs] = useState<MIDIInput[]>([]);
  const [outputs, setOutputs] = useState<MIDIOutput[]>([]);
  const [inputId, setInputId] = useState('');
  const [outputId, setOutputId] = useState('');
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [problem, setProblem] = useState<string>();
  const [error, setError] = useState<unknown>();
  const live = useRef<Connection | undefined>(undefined);
  const attempt = useRef(0);
  const identifyAbort = useRef<AbortController | undefined>(undefined);

  const release = () => {
    identifyAbort.current?.abort();
    identifyAbort.current = undefined;
    live.current?.sync.dispose();
    live.current?.editor.dispose();
    live.current?.session.close();
    live.current = undefined;
  };

  const disconnect = () => {
    attempt.current += 1;
    release();
    setError(undefined);
    setPhase({ kind: 'idle' });
  };

  // Leaving the screen releases the ports, including a connection still being opened.
  useEffect(
    () => () => {
      attempt.current += 1;
      release();
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
      const remembered = readRememberedPorts();
      setInputId((current) =>
        nextInputs.some((port) => port.id === current)
          ? current
          : (remembered?.input ?? preferredPort(nextInputs)),
      );
      setOutputId((current) =>
        nextOutputs.some((port) => port.id === current)
          ? current
          : (remembered?.output ?? preferredPort(nextOutputs)),
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
      setProblem(t('connection.denied'));
    }
  };

  const connect = async (input: MidiInputLike, output: MidiOutputLike) => {
    const ticket = ++attempt.current;
    release();
    setProblem(undefined);
    setError(undefined);
    setPhase({ kind: 'connecting', done: 0 });
    const abort = new AbortController();
    identifyAbort.current = abort;
    const stillHere = () => ticket === attempt.current;
    let session: MidiSession | undefined;
    try {
      const identity = await identify(input, output, 1500, abort.signal);
      if (!stillHere()) {
        return;
      }
      const config = RolandGR55SysExConfig;
      if (
        identity.manufacturerId !== config.manufacturerId ||
        identity.deviceFamily !== config.familyCode
      ) {
        setProblem(t('connection.wrongDevice'));
        setPhase({ kind: 'idle' });
        return;
      }
      session = new MidiSession(input, output, config, identity.deviceId);
      const editor = new Gr55Editor(session, (reason) => {
        if (stillHere()) {
          setError(reason);
        }
      });
      const sync = new SyncEngine(editor, openSyncCache());
      const system = new Gr55System(session);
      live.current = { session, editor, sync, system };
      await editor.readSystem();
      if (!stillHere()) {
        return;
      }
      await editor.readPatch((done) => {
        if (stillHere()) {
          setPhase({ kind: 'connecting', done });
        }
      });
      if (!stillHere()) {
        return;
      }
      localStorage.setItem(
        PORT_MEMORY,
        JSON.stringify({
          input: String((input as unknown as MIDIPort).id),
          output: String((output as unknown as MIDIPort).id),
        } satisfies RememberedPorts),
      );
      setPhase({ kind: 'connected', connection: { session, editor, sync, system } });
      // The cache shows at once; the pedal is then read behind whatever screen is open.
      void sync
        .load()
        .catch(() => {})
        .then(() => sync.start());
    } catch (reason) {
      if (live.current?.session === session) {
        release();
      } else {
        session?.close();
      }
      if (!stillHere() || reason instanceof MidiAbortError) {
        return;
      }
      setProblem(
        reason instanceof MidiTimeoutError ? t('connection.noReply') : t('connection.lost'),
      );
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
    const { editor, session, sync, system } = phase.connection;
    // A pedal met for the first time is walked through the stage setup before anything else.
    // After that the Stage is the root; the editor and the library are reached from it.
    const home = loadSetup().complete ? stageRoute : setupRoute;
    return (
      <SyncProvider value={sync}>
        <SystemProvider value={system}>
          <DiscardNotice editor={editor} />
          <SyncBadge editor={editor} />
          <Routes>
            <Route index element={<Navigate to={home} replace />} />
            <Route
              path={setupRoute}
              element={<Wizard editor={editor} session={session} onError={setError} />}
            />
            {/* Connecting is done: its address leads on. */}
            <Route path={connectRoute} element={<Navigate to={`../${home}`} replace />} />
            {/* Addresses from before the stage-first routes. */}
            <Route path="setup" element={<Navigate to={`../${setupRoute}`} replace />} />
            <Route path="device" element={<Navigate to={`../${deviceRoute}`} replace />} />
            <Route path={libraryRoute} element={<Library editor={editor} onError={setError} />} />
            <Route
              path={`${libraryRoute}/:slot`}
              element={<Library editor={editor} onError={setError} />}
            />
            {/* The canvas is the editor's root; each block opens its inspector. */}
            <Route path="editor" element={<Canvas editor={editor} />} />
            <Route
              path="editor/:pageId/:sectionSlug?"
              element={
                <Workspace
                  editor={editor}
                  error={error}
                  onError={setError}
                  onDisconnect={disconnect}
                />
              }
            />
            <Route path={stageRoute} element={<Stage editor={editor} onError={setError} />} />
            <Route
              path={setlistRoute}
              element={<SetlistScreen editor={editor} onError={setError} />}
            />
            <Route
              path={deviceRoute}
              element={<DeviceScreen editor={editor} onError={setError} />}
            />
            <Route
              path={gkRoute}
              element={<GkSetsScreen editor={editor} session={session} onError={setError} />}
            />
            <Route
              path="*"
              element={
                <main className="gate">
                  <h1>{t('app.notFound')}</h1>
                  <p>
                    <Link to={stageRoute}>{t('stage.title')}</Link>
                  </p>
                </main>
              }
            />
          </Routes>
        </SystemProvider>
      </SyncProvider>
    );
  }

  const connecting = phase.kind === 'connecting';
  return (
    <main className="connect">
      <Link className="brand" to="/">
        {t('app.name')}
      </Link>
      <h1>{t('connection.title')}</h1>
      <p>{t('connection.intro')}</p>

      {!access ? (
        <button type="button" className="primary" onClick={() => void allow()}>
          {t('connection.allow')}
        </button>
      ) : inputs.length === 0 || outputs.length === 0 ? (
        <p className="hint">{t('connection.noPorts')}</p>
      ) : (
        <div className="ports">
          <label>
            {t('connection.input')}
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
            {t('connection.output')}
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
            {t('connection.connect')}
          </button>
        </div>
      )}

      {connecting && (
        <p className="status" role="status">
          {phase.done === 0
            ? t('connection.connecting')
            : t('gr55.reading', phase.done, PATCH_BLOCKS.length)}
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
            {t('connection.simulate')}
          </button>
        </p>
      )}
    </main>
  );
}
