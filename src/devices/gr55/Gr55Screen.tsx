import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useT } from '../../copy';
import { useAppDispatch, useAppSelector } from '../../app/store/hooks';
import { setPhase } from '../../app/store/slices/connectionSlice';
import { setLastRoute } from '../../app/store/slices/sessionPrefsSlice';
import { AppShell } from './AppShell';
import {
  childRouteOfPath,
  connectRoute,
  isResumableRoute,
  normalizeAppRoute,
  patchHref,
  patchRoute,
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
 * Connected app is a single Patch workspace.
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
    } else if (child === 'bank' || child === 'global') {
      dispatch(setLastRoute(patchRoute));
    }
  }, [dispatch, location.pathname, phase]);

  if (phase !== 'connected' || !live) {
    return <ConnectScreen />;
  }

  const { editor, system } = live;
  const resumeTarget = isResumableRoute(lastRoute)
    ? lastRoute
    : normalizeAppRoute(lastRoute || childRouteOfPath(location.pathname));

  return (
    <ConnectionProvider value={live}>
      <SystemProvider value={system}>
        <Routes>
          <Route index element={<Navigate to={resumeTarget} replace />} />
          <Route path={connectRoute} element={<Navigate to={`../${resumeTarget}`} replace />} />
          <Route path={patchRoute} element={<AppShell editor={editor} />} />
          {/* Legacy addresses → Patch workspace */}
          <Route path="bank" element={<Navigate to={`../${patchRoute}`} replace />} />
          <Route path="global" element={<Navigate to={`../${patchRoute}`} replace />} />
          <Route path="palco" element={<Navigate to={`../${patchRoute}`} replace />} />
          <Route path="estudio" element={<Navigate to={`../${patchRoute}`} replace />} />
          <Route path="maestro" element={<Navigate to={`../${patchRoute}`} replace />} />
          <Route path="editor/*" element={<Navigate to={`../${patchRoute}`} replace />} />
          <Route path="configuracao" element={<Navigate to={`../${patchRoute}`} replace />} />
          <Route path="configurar" element={<Navigate to={`../${patchRoute}`} replace />} />
          <Route path="dispositivo/*" element={<Navigate to={`../${patchRoute}`} replace />} />
          <Route path="setup" element={<Navigate to={`../${patchRoute}`} replace />} />
          <Route path="device" element={<Navigate to={`../${patchRoute}`} replace />} />
          <Route
            path="*"
            element={
              <main className="gate">
                <h1>{t('app.notFound')}</h1>
                <p>
                  <Link to={patchHref}>{t('gr55.navPatch')}</Link>
                </p>
              </main>
            }
          />
        </Routes>
      </SystemProvider>
    </ConnectionProvider>
  );
}
