import { useMemo, useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../../copy';
import { useAppDispatch } from '../../app/store/hooks';
import type { Gr55Editor } from './editor';
import { exitToHome } from './connectionThunks';
import { LocaleSwitch } from '../../shell/LocaleSwitch';
import { Gr55Workspace } from './Gr55Workspace';
import { createGr55Session } from './intentions/session';
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
  const session = useMemo(() => createGr55Session(editor, system), [editor, system]);
  const view = useSyncExternalStore(session.subscribe, session.getState, session.getState);
  const [error, setError] = useState<unknown>();
  const syncBusy = view.phase === 'verifying' || view.phase === 'reading';

  const onSync = () => {
    void session.reread().catch(setError);
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
          <LocaleSwitch inline />
          <span className="hint" role="status">
            {view.blocked ? t('intention.blocked') : t('gr55.authorityPedal')}
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
          <Gr55Workspace editor={editor} session={session} onError={setError} />
        </section>
      </div>
    </div>
  );
}
