import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { useT } from '../../copy';
import { useAppDispatch, useAppSelector } from '../../app/store/hooks';
import { setPhase } from '../../app/store/slices/connectionSlice';
import { AppShell } from './AppShell';
import { connectRoute, patchHref, patchRoute } from './routes';
import { SystemProvider } from './SystemParts';
import { ConnectScreen } from './ConnectScreen';
import { getLiveConnection, retainLiveConnection } from './connectionRuntime';

/**
 * GR-55 shell. Editing starts only after a confirmed read. Nothing about the
 * pedal is restored from the browser.
 */
export default function Gr55Screen() {
  const t = useT();
  const dispatch = useAppDispatch();
  const phase = useAppSelector((state) => state.connection.phase);
  const [, setError] = useState<unknown>();
  void setError;
  const live = phase === 'connected' ? getLiveConnection() : undefined;

  useEffect(() => {
    const release = retainLiveConnection(() => {
      dispatch(setPhase('needsPrompt'));
    });
    return release;
  }, [dispatch]);

  if (phase !== 'connected' || !live) {
    return <ConnectScreen />;
  }

  const { editor, system } = live;

  return (
    <SystemProvider value={system}>
      <Routes>
        <Route index element={<Navigate to={patchRoute} replace />} />
        <Route path={connectRoute} element={<Navigate to={`../${patchRoute}`} replace />} />
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
  );
}
