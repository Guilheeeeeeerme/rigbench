import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useT } from '../../copy';
import { useAppDispatch, useAppSelector } from '../../app/store/hooks';
import { setPhase } from '../../app/store/slices/connectionSlice';
import { setLastRoute } from '../../app/store/slices/sessionPrefsSlice';
import { Stage } from './Stage';
import { DeviceScreen } from './DeviceScreen';
import { AppNav } from './AppNav';
import { SetupScreen } from './Setup';
import { Studio } from './Studio';
import {
  connectRoute,
  configRoute,
  deviceRoute,
  gkRoute,
  isResumableRoute,
  maestroRoute,
  childRouteOfPath,
  setupRoute,
  stageHref,
  stageRoute,
  studioRoute,
} from './routes';
import { GkSetsScreen } from './GkSets';
import { loadSetup } from './setupState';
import { SystemProvider } from './SystemParts';
import { Wizard } from './Wizard';
import { DiscardNotice } from './DiscardNotice';
import { SyncBadge, SyncProvider } from './sync/SyncBadge';
import { MaestroHost } from '../../maestro/MaestroHost';
import { ConnectScreen } from './ConnectScreen';
import {
  ConnectionProvider,
  getLiveConnection,
  retainLiveConnection,
} from './connectionRuntime';
import { resumeIfPossible } from './connectionThunks';

/**
 * GR-55 shell: silent resume when remembered ports still work, otherwise the
 * connect prompt. Live MIDI objects live in connectionRuntime, not Redux.
 */
export default function Gr55Screen() {
  const t = useT();
  const dispatch = useAppDispatch();
  const location = useLocation();
  const phase = useAppSelector((state) => state.connection.phase);
  const lastRoute = useAppSelector((state) => state.sessionPrefs.lastRoute);
  const [error, setError] = useState<unknown>();
  // Re-read after every Redux phase change so connect completion paints Stage.
  const live = phase === 'connected' ? getLiveConnection() : undefined;

  useEffect(() => {
    const release = retainLiveConnection(() => {
      dispatch(setPhase('needsPrompt'));
    });
    void dispatch(resumeIfPossible());
    return release;
  }, [dispatch]);

  useEffect(() => {
    if (phase !== 'connected') {
      return;
    }
    const child = childRouteOfPath(location.pathname);
    if (isResumableRoute(child)) {
      dispatch(setLastRoute(child));
    }
  }, [dispatch, location.pathname, phase]);

  if (phase !== 'connected' || !live) {
    return <ConnectScreen />;
  }

  const { editor, session, sync, system } = live;
  const home = loadSetup().complete ? stageRoute : setupRoute;
  const resumeTarget = isResumableRoute(lastRoute) ? lastRoute : home;

  return (
    <ConnectionProvider value={live}>
      <SyncProvider value={sync}>
        <SystemProvider value={system}>
          <DiscardNotice editor={editor} />
          <SyncBadge editor={editor} />
          <MaestroHost editor={editor} />
          <AppNav />
          <Routes>
            <Route index element={<Navigate to={resumeTarget} replace />} />
            <Route
              path={setupRoute}
              element={<Wizard editor={editor} session={session} onError={setError} />}
            />
            <Route path={connectRoute} element={<Navigate to={`../${resumeTarget}`} replace />} />
            <Route path="setup" element={<Navigate to={`../${setupRoute}`} replace />} />
            <Route path="device" element={<Navigate to={`../${deviceRoute}`} replace />} />
            <Route path={studioRoute} element={<Navigate to={`../${stageRoute}`} replace />} />
            <Route
              path={maestroRoute}
              element={<Studio editor={editor} error={error} onError={setError} />}
            />
            <Route path="editor/*" element={<Navigate to={`../${stageRoute}`} replace />} />
            <Route path={stageRoute} element={<Stage editor={editor} onError={setError} />} />
            <Route path={configRoute} element={<SetupScreen />} />
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
                    <Link to={stageHref}>{t('stage.title')}</Link>
                  </p>
                </main>
              }
            />
          </Routes>
        </SystemProvider>
      </SyncProvider>
    </ConnectionProvider>
  );
}
