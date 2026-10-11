import { Link } from 'react-router-dom';
import { useT } from '../../copy';
import { useAppDispatch, useAppSelector } from '../../app/store/hooks';
import {
  setSelectedInputId,
  setSelectedOutputId,
  type ConnectionProblem,
} from '../../app/store/slices/connectionSlice';
import type { CopyKey } from '../../copy';
import { PATCH_BLOCKS } from './patchLayout';
import {
  connectSelectedPorts,
  connectSimulatedPedal,
  requestMidiAccess,
} from './connectionThunks';

const PROBLEM_COPY: Record<Exclude<ConnectionProblem, null>, CopyKey> = {
  denied: 'connection.denied',
  noReply: 'connection.noReply',
  wrongDevice: 'connection.wrongDevice',
  lost: 'connection.lost',
  noPorts: 'connection.noPorts',
};

/** Allow MIDI, pick ports, or watch a silent reconnect — shown when not connected. */
export function ConnectScreen() {
  const t = useT();
  const dispatch = useAppDispatch();
  const {
    phase,
    progress,
    hasAccess,
    inputs,
    outputs,
    selectedInputId,
    selectedOutputId,
    problem,
  } = useAppSelector((state) => state.connection);

  const connecting = phase === 'connecting' || phase === 'requesting';

  return (
    <main className="connect">
      <Link className="brand" to="/">
        {t('app.name')}
      </Link>
      <h1>{t('connection.title')}</h1>
      <p>{t('connection.intro')}</p>

      {!hasAccess ? (
        <button
          type="button"
          className="primary"
          disabled={connecting}
          onClick={() => void dispatch(requestMidiAccess())}
        >
          {t('connection.allow')}
        </button>
      ) : inputs.length === 0 || outputs.length === 0 ? (
        <p className="hint">{t('connection.noPorts')}</p>
      ) : (
        <div className="ports">
          <label>
            {t('connection.input')}
            <select
              value={selectedInputId}
              disabled={connecting}
              onChange={(event) => dispatch(setSelectedInputId(event.target.value))}
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
              value={selectedOutputId}
              disabled={connecting}
              onChange={(event) => dispatch(setSelectedOutputId(event.target.value))}
            >
              {outputs.map((port) => (
                <option key={port.id} value={port.id}>
                  {port.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="primary"
            disabled={connecting}
            onClick={() => void dispatch(connectSelectedPorts())}
          >
            {t('connection.connect')}
          </button>
        </div>
      )}

      {connecting && (
        <p className="status" role="status">
          {progress === 0
            ? t('connection.connecting')
            : t('gr55.reading', progress, PATCH_BLOCKS.length)}
        </p>
      )}
      {problem && (
        <p className="error" role="alert">
          {t(PROBLEM_COPY[problem])}
        </p>
      )}

      {import.meta.env.DEV && (
        <p className="hint">
          <button
            type="button"
            disabled={connecting}
            onClick={() => void dispatch(connectSimulatedPedal())}
          >
            {t('connection.simulate')}
          </button>
        </p>
      )}
    </main>
  );
}
