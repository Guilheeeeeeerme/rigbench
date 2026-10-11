import { NavLink, useLocation } from 'react-router-dom';
import { useT } from '../../copy';
import { configHref, maestroHref, setupRoute, stageHref } from './routes';

/**
 * The whole navigation of the app, rendered once above every screen: two
 * destinations. Stage is where a musician plays; Setup is the global
 * configuration set once and changed at a very low frequency. The first-run
 * wizard shows no bar — it is one guided path from connect to playing.
 */
export function AppNav() {

  const t = useT();
  const location = useLocation();
  if (location.pathname.endsWith(`/${setupRoute}`)) {
    return null;
  }
  const item = (to: string, label: string) => (
    <NavLink
      to={to}
      className={({ isActive }) => (isActive ? 'app-nav-item active' : 'app-nav-item')}
    >
      {label}
    </NavLink>
  );
  return (
    <nav className="app-nav" aria-label={t('app.name')}>
      {item(stageHref, t('gr55.navStage'))}
      {item(maestroHref, t('gr55.navMaestro'))}
      {item(configHref, t('gr55.navConfig'))}
    </nav>
  );
}
