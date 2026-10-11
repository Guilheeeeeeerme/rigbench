import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useT } from '../../copy';
import { useAppDispatch, useAppSelector } from '../../app/store/hooks';
import { setPhase } from '../../app/store/slices/connectionSlice';
import { setLastRoute } from '../../app/store/slices/sessionPrefsSlice';
import { AppShell } from './AppShell';
import {
  bankHref,
  bankRoute,
  childRouteOfPath,
  connectRoute,
  globalRoute,
  isResumableRoute,
  normalizeAppRoute,
} from './routes';
import { SystemProvider } from './SystemParts';
import { ConnectScreen } from './ConnectScreen';
import {
  ConnectionProvider,
  getLiveConnection,
  retainLiveConnection,
} from './connectionRuntime';
import { resumeIfPossible } from './connectionThunks';

/**
 * GR-55 shell: silent resume when remembered ports still work, otherwise Connect.
 * Connected app is Bank | Global only.
 */
export default function Gr55Screen() {
  const t = useT();
  const dispatch = useAppDispatch();
  const location = useLocation();
  const phase = useAppSelector((state) => state.connection.phase);
  const lastRoute = useAppSelector((state) => state.sessionPrefs.lastRoute);
  const [, setError] = useState<unknown>();
  void setError;
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

  const { editor, system } = live;
  const resumeTarget = isResumableRoute(lastRoute)
    ? lastRoute
    : lastRoute
      ? normalizeAppRoute(lastRoute)
      : normalizeAppRoute(childRouteOfPath(location.pathname));

  return (
    <ConnectionProvider value={live}>
      <SystemProvider value={system}>
        <Routes>
          <Route index element={<Navigate to={resumeTarget} replace />} />
          <Route path={connectRoute} element={<Navigate to={`../${resumeTarget}`} replace />} />
          <Route path={bankRoute} element={<AppShell editor={editor} page="bank" />} />
          <Route path={globalRoute} element={<AppShell editor={editor} page="global" />} />
          {/* Legacy addresses → Bank or Global */}
          <Route path="patch" element={<Navigate to={`../${bankRoute}`} replace />} />
          <Route path="palco" element={<Navigate to={`../${bankRoute}`} replace />} />
          <Route path="estudio" element={<Navigate to={`../${bankRoute}`} replace />} />
          <Route path="maestro" element={<Navigate to={`../${bankRoute}`} replace />} />
          <Route path="editor/*" element={<Navigate to={`../${bankRoute}`} replace />} />
          <Route path="configuracao" element={<Navigate to={`../${globalRoute}`} replace />} />
          <Route path="configurar" element={<Navigate to={`../${globalRoute}`} replace />} />
          <Route path="dispositivo/*" element={<Navigate to={`../${globalRoute}`} replace />} />
          <Route path="setup" element={<Navigate to={`../${globalRoute}`} replace />} />
          <Route path="device" element={<Navigate to={`../${globalRoute}`} replace />} />
          <Route
            path="*"
            element={
              <main className="gate">
                <h1>{t('app.notFound')}</h1>
                <p>
                  <Link to={bankHref}>{t('gr55.navBank')}</Link>
                </p>
              </main>
            }
          />
        </Routes>
      </SystemProvider>
    </ConnectionProvider>
  );
}
