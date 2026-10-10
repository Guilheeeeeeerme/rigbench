import { Suspense, lazy } from 'react';
import { HashRouter, Link, Route, Routes } from 'react-router-dom';
import { LocaleProvider, useT } from '../copy';
import { BrowserGate } from '../shell/BrowserGate';
import { DeviceHome } from '../shell/DeviceHome';
import { LocaleSwitch } from '../shell/LocaleSwitch';

// The GR-55 address map is large; it loads only when its editor is opened.
const Gr55Screen = lazy(() => import('../devices/gr55/Gr55Screen'));

function NotFound() {
  const t = useT();
  return (
    <main className="gate">
      <p className="brand">{t('app.name')}</p>
      <h1>{t('app.notFound')}</h1>
      <p>
        <Link to="/">{t('app.backHome')}</Link>
      </p>
    </main>
  );
}

export function App() {
  return (
    <LocaleProvider>
      <BrowserGate>
        {/* Hash routing, so the build works on any static host without rewrite rules. */}
        <HashRouter>
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<DeviceHome />} />
              <Route path="/gr55/*" element={<Gr55Screen />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </HashRouter>
      </BrowserGate>
      <LocaleSwitch />
    </LocaleProvider>
  );
}
