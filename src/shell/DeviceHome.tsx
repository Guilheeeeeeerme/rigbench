import { Link } from 'react-router-dom';
import { useT } from '../copy';
import { devices } from '../devices/registry';

export function DeviceHome() {
  const t = useT();
  return (
    <main className="home">
      <header>
        <p className="brand">{t('app.name')}</p>
        <p className="tagline">{t('app.tagline')}</p>
      </header>
      <h1>{t('home.title')}</h1>
      <ul className="device-list">
        {devices.map((device) => (
          <li key={device.id}>
            {device.route ? (
              <Link className="device-card" to={device.route}>
                <span className="device-name">{t(`devices.${device.id}.name`)}</span>
                <span className="device-kind">{t(`devices.${device.id}.kind`)}</span>
                <span className="device-action">{t('home.open')}</span>
              </Link>
            ) : (
              <div className="device-card is-soon" aria-disabled="true">
                <span className="device-name">{t(`devices.${device.id}.name`)}</span>
                <span className="device-kind">{t(`devices.${device.id}.kind`)}</span>
                <span className="device-action">{t('home.comingSoon')}</span>
              </div>
            )}
          </li>
        ))}
      </ul>
      <footer>{t('app.footer')}</footer>
    </main>
  );
}
