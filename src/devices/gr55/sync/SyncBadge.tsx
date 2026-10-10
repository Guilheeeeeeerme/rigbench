import { createContext, useContext, useState, useSyncExternalStore } from 'react';
import { useLocale, useT } from '../../../copy';
import { slotsOfMode } from '../slots';
import type { Gr55Editor } from '../editor';
import type { SyncEngine, SyncState } from './engine';

const SyncContext = createContext<SyncEngine | undefined>(undefined);

export const SyncProvider = SyncContext.Provider;

/** The sync engine of the connected pedal. */
export function useSync(): SyncEngine {
  const engine = useContext(SyncContext);
  if (!engine) {
    throw new Error('useSync needs a connected pedal above it');
  }
  return engine;
}

export function useSyncState(engine: SyncEngine): SyncState {
  return useSyncExternalStore(engine.subscribe, engine.snapshot);
}

/** The cached name of a slot; undefined until sync has read it. Follows the cache live. */
export function useSlotNames(engine: SyncEngine): (userPatchNumber: number) => string | undefined {
  useSyncExternalStore(engine.subscribe, engine.slotsSnapshot);
  return (userPatchNumber) => engine.slot(userPatchNumber)?.name;
}

/**
 * The sync seal in the corner of every screen: reading slot N of 297, ready, or how many
 * slots changed on the pedal. Clicking it opens the detail; it never blocks the screen.
 */
export function SyncBadge({ editor }: { editor: Gr55Editor }) {
  const t = useT();
  const locale = useLocale();
  const engine = useSync();
  const state = useSyncState(engine);
  const [open, setOpen] = useState(false);
  const mode = useSyncExternalStore(editor.subscribe, () => editor.gkMode);
  const slots = slotsOfMode(mode);
  const labelOf = (userPatchNumber: number | undefined) =>
    slots.find((slot) => slot.userPatchNumber === userPatchNumber)?.label ?? '';

  const { phase, done, total } = state;
  const percent = total > 0 ? Math.floor((done / total) * 100) : 0;
  const label =
    phase === 'syncing'
      ? t('sync.badge.syncing', labelOf(state.current), done, total)
      : phase === 'paused'
        ? t('sync.badge.paused', done, total)
        : phase === 'ready'
          ? t('sync.badge.ready', total)
          : phase === 'changed'
            ? t('sync.badge.changed', state.changed.length)
            : phase === 'failed'
              ? t('sync.badge.failed', done, total)
              : t('sync.badge.idle', done, total);
  const working = phase === 'syncing' || phase === 'paused';

  return (
    <div className="sync">
      {open && (
        <section className="sync-detail" aria-label={t('sync.title')}>
          <h2>{t('sync.title')}</h2>
          <p className="hint">{t('sync.intro')}</p>

          {(working || phase === 'idle' || phase === 'failed') && (
            <>
              <progress max={total || 1} value={done} />
              <p className="status" role="status">
                {t('sync.percent', percent)}
                {phase === 'syncing' && state.etaMs !== undefined && (
                  <> · {t('sync.eta', Math.round(state.etaMs / 60_000))}</>
                )}
              </p>
              {phase === 'syncing' && state.current !== undefined && (
                <p className="hint">
                  {t('sync.reading', labelOf(state.current))} {t('sync.queue', total - done)}
                </p>
              )}
            </>
          )}
          {phase === 'failed' && (
            <p className="error" role="alert">
              {t('sync.failed')}
            </p>
          )}
          {(phase === 'ready' || phase === 'changed') && state.finishedAt !== undefined && (
            <p className="status">
              {t(
                'sync.finishedAt',
                new Date(state.finishedAt).toLocaleString(locale, {
                  dateStyle: 'short',
                  timeStyle: 'short',
                }),
              )}{' '}
              {state.fullReads > 0 && t('sync.readInFull', state.fullReads)}
            </p>
          )}

          {state.changed.length > 0 && (
            <>
              <h3>{t('sync.changedTitle')}</h3>
              <ul className="sync-changed">
                {state.changed.map((entry) => (
                  <li key={entry.userPatchNumber}>
                    {t(
                      'sync.changedEntry',
                      labelOf(entry.userPatchNumber),
                      entry.before || t('gr55.unnamed'),
                      entry.after || t('gr55.unnamed'),
                      entry.parameters,
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="actions">
            {phase === 'syncing' && (
              <button type="button" onClick={() => engine.pause()}>
                {t('sync.pause')}
              </button>
            )}
            {phase === 'paused' && (
              <button type="button" className="primary" onClick={() => engine.resume()}>
                {t('sync.resume')}
              </button>
            )}
            {working && (
              <button type="button" onClick={() => void engine.cancel()}>
                {t('sync.stop')}
              </button>
            )}
            {(phase === 'idle' || phase === 'failed') && (
              <button type="button" className="primary" onClick={() => void engine.start()}>
                {done > 0 ? t('sync.continue') : t('sync.start')}
              </button>
            )}
            {phase === 'changed' && (
              <button
                type="button"
                className="primary"
                onClick={() => void engine.acknowledgeChanges()}
              >
                {t('sync.acknowledge')}
              </button>
            )}
            {(phase === 'ready' || phase === 'changed') && (
              <button type="button" onClick={() => void engine.start()}>
                {t('sync.start')}
              </button>
            )}
            {!working && (
              <button type="button" onClick={() => void engine.start({ full: true })}>
                {t('sync.full')}
              </button>
            )}
            <button type="button" onClick={() => setOpen(false)}>
              {t('sync.close')}
            </button>
          </div>
          {!working && <p className="hint">{t('sync.fullHint')}</p>}
        </section>
      )}
      <button
        type="button"
        className={`sync-badge is-${phase}`}
        aria-expanded={open}
        title={t('sync.title')}
        onClick={() => setOpen((current) => !current)}
      >
        {working && (
          <span className="sync-bar" aria-hidden="true">
            <span style={{ width: `${percent}%` }} />
          </span>
        )}
        {label}
      </button>
    </div>
  );
}
