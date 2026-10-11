import { useEffect, useState, useSyncExternalStore } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useT } from '../../copy';
import { useAppDispatch } from '../../app/store/hooks';
import { MaestroDrawer } from '../../maestro/MaestroDrawer';
import { saveSession, type SessionId } from '../../maestro/session';
import type { Gr55Editor } from './editor';
import { GlobalPage } from './GlobalPage';
import { PatchPage } from './PatchPage';
import { exitToHome } from './connectionThunks';
import { globalHref, globalRoute, patchHref, patchRoute } from './routes';
import { asSnapshotSource } from './snapshotHost';
import { getAuthority, requestSnapshot, subscribeAuthority } from './sessionAuthority';
import { useSystem } from './SystemParts';

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Connected app: Exit · Patch | Global, Maestro left, parameters right.
 */
export function AppShell({
  editor,
  page,
}: {
  editor: Gr55Editor;
  page: 'patch' | 'global';
}) {
  const t = useT();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const system = useSystem();
  const [error, setError] = useState<unknown>();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [snapshotBusy, setSnapshotBusy] = useState(false);
  const authority = useSyncExternalStore(subscribeAuthority, getAuthority);

  const session: SessionId = page === 'global' ? 'system' : 'patch';

  useEffect(() => {
    saveSession(session);
  }, [session]);

  const source = asSnapshotSource({ editor, system });

  const onSnapshot = () => {
    setSnapshotBusy(true);
    void requestSnapshot(source)
      .catch(setError)
      .finally(() => setSnapshotBusy(false));
  };

  const onExit = () => {
    dispatch(exitToHome());
    void navigate('/');
  };

  return (
    <div className="app-shell">
      <header className="app-shell-bar">
        <button type="button" className="app-exit" onClick={onExit}>
          {t('gr55.exit')}
        </button>
        <nav className="app-nav" aria-label={t('app.name')}>
          <NavLink
            to={patchHref}
            className={({ isActive }) => (isActive ? 'app-nav-item active' : 'app-nav-item')}
          >
            {t('gr55.navPatch')}
          </NavLink>
          <NavLink
            to={globalHref}
            className={({ isActive }) => (isActive ? 'app-nav-item active' : 'app-nav-item')}
          >
            {t('gr55.navGlobal')}
          </NavLink>
        </nav>
        <div className="app-shell-actions">
          <span className="hint" role="status">
            {authority === 'app' ? t('gr55.authorityApp') : t('gr55.authorityPedal')}
          </span>
          <button type="button" disabled={snapshotBusy} onClick={onSnapshot}>
            {snapshotBusy ? t('gr55.snapshotBusy') : t('gr55.requestSnapshot')}
          </button>
        </div>
      </header>

      {error != null && (
        <p className="error" role="alert">
          {t('gr55.error', errorText(error))}{' '}
          <button type="button" onClick={() => setError(undefined)}>
            {t('gr55.dismiss')}
          </button>
        </p>
      )}

      <div className="app-shell-body">
        <section className="app-maestro" aria-label={t('maestro.title')}>
          <MaestroDrawer
            editor={editor}
            open
            variant="pane"
            session={session}
            onClose={() => undefined}
            onOpenSettings={() => setSettingsOpen(true)}
            settingsOpen={settingsOpen}
            onSettingsOpenChange={setSettingsOpen}
          />
        </section>
        <section className="app-main" aria-label={page === 'patch' ? patchRoute : globalRoute}>
          {page === 'patch' ? (
            <PatchPage editor={editor} onError={setError} />
          ) : (
            <GlobalPage editor={editor} onError={setError} />
          )}
        </section>
      </div>
    </div>
  );
}
