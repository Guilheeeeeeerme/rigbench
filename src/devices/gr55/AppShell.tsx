import { useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../../copy';
import { useAppDispatch } from '../../app/store/hooks';
import type { Gr55Editor } from './editor';
import { exitToHome } from './connectionThunks';
import { PatchWorkspace } from './PatchWorkspace';
import { asSnapshotSource } from './snapshotHost';
import { getAuthority, syncFromPedal, subscribeAuthority } from './sessionAuthority';
import { useSystem } from './SystemParts';

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Connected app: Exit · Sync · single patch workspace (no Maestro, no Global peer nav).
 */
export function AppShell({ editor }: { editor: Gr55Editor }) {
  const t = useT();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const system = useSystem();
  const [error, setError] = useState<unknown>();
  const [syncBusy, setSyncBusy] = useState(false);
  const authority = useSyncExternalStore(subscribeAuthority, getAuthority);
  const source = asSnapshotSource({ editor, system });

  const onSync = () => {
    setSyncBusy(true);
    void syncFromPedal(source, async () => {
      await editor.readPatchLocation();
      const slot = editor.patchSource;
      if (slot?.kind === 'slot') {
        await editor.loadUserSlotIntoWorkingCopy(slot.userPatchNumber);
      }
    })
      .catch(setError)
      .finally(() => setSyncBusy(false));
  };

  const onExit = () => {
    dispatch(exitToHome());
    void navigate('/');
  };

  return (
    <div className="app-shell app-shell-solo">
      <header className="app-shell-bar">
        <button type="button" className="app-exit" onClick={onExit}>
          {t('gr55.exit')}
        </button>
        <h1 className="app-shell-title">{t('gr55.mvp.title')}</h1>
        <div className="app-shell-actions">
          <span className="hint" role="status">
            {authority === 'app' ? t('gr55.authorityApp') : t('gr55.authorityPedal')}
          </span>
          <button type="button" disabled={syncBusy} onClick={onSync} title={t('gr55.syncHint')}>
            {syncBusy ? t('gr55.syncBusy') : t('gr55.sync')}
          </button>
        </div>
      </header>

      {error != null && (
        <p className="error app-shell-error" role="alert">
          {t('gr55.error', errorText(error))}{' '}
          <button type="button" onClick={() => setError(undefined)}>
            {t('gr55.dismiss')}
          </button>
        </p>
      )}

      <div className="app-shell-body chat-collapsed">
        <section className="app-main" aria-label={t('gr55.mvp.title')}>
          <PatchWorkspace editor={editor} onError={setError} />
        </section>
      </div>
    </div>
  );
}
