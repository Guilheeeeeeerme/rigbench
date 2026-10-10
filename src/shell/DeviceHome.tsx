import { Link } from 'react-router-dom';
import { en } from '../copy/en';
import { devices } from '../devices/registry';

export function DeviceHome() {
  return (
    <main className="home">
      <header>
        <p className="brand">{en.app.name}</p>
        <p className="tagline">{en.app.tagline}</p>
      </header>
      <h1>{en.home.title}</h1>
      <ul className="device-list">
        {devices.map((device) => (
          <li key={device.id}>
            {device.route ? (
              <Link className="device-card" to={device.route}>
                <span className="device-name">{device.name}</span>
                <span className="device-kind">{device.kind}</span>
                <span className="device-action">{en.home.open}</span>
              </Link>
            ) : (
              <div className="device-card is-soon" aria-disabled="true">
                <span className="device-name">{device.name}</span>
                <span className="device-kind">{device.kind}</span>
                <span className="device-action">{en.home.comingSoon}</span>
              </div>
            )}
          </li>
        ))}
      </ul>
      <footer>{en.app.footer}</footer>
    </main>
  );
}
