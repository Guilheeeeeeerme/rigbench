import { Suspense, lazy } from 'react';
import { HashRouter, Link, Route, Routes } from 'react-router-dom';
import { en } from '../copy/en';
import { BrowserGate } from '../shell/BrowserGate';
import { DeviceHome } from '../shell/DeviceHome';

// The GR-55 address map is large; it loads only when its editor is opened.
const Gr55Screen = lazy(() => import('../devices/gr55/Gr55Screen'));

function NotFound() {
  return (
    <main className="gate">
      <p className="brand">{en.app.name}</p>
      <h1>{en.app.notFound}</h1>
      <p>
        <Link to="/">{en.app.backHome}</Link>
      </p>
    </main>
  );
}

export function App() {
  return (
    <BrowserGate>
      {/* Hash routing, so the build works on any static host without rewrite rules. */}
      <HashRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<DeviceHome />} />
            <Route path="/gr55" element={<Gr55Screen />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </HashRouter>
    </BrowserGate>
  );
}
