import { Link } from 'react-router-dom';
import { useT } from '../../copy';
import { deviceHref, gkHref, setupHref } from './routes';

/**
 * One screen for what is configured once and changed at a very low frequency:
 * the instrument (GK pickup, sensitivity), the pedal-wide settings, and the
 * guided recalibration. Any configuration can also be done by talking to Maestro.
 */
export function SetupScreen() {
  const t = useT();
  return (
    <main className="config">
      <header className="config-head">
        <h1>{t('config.title')}</h1>
        <p className="hint">{t('config.intro')}</p>
      </header>
      <div className="config-grid">
        <Link className="config-card" to={deviceHref}>
          <strong>{t('device.title')}</strong>
          <span>{t('config.deviceItem')}</span>
        </Link>
        <Link className="config-card" to={gkHref}>
          <strong>{t('gk.title')}</strong>
          <span>{t('config.gkItem')}</span>
        </Link>
        <Link className="config-card" to={setupHref}>
          <strong>{t('gr55.navRecalibrate')}</strong>
          <span>{t('config.recalibrateItem')}</span>
        </Link>
      </div>
    </main>
  );
}
