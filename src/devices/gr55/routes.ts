/** The routes the GR-55 owns, under /gr55. The MVP is Stage on top, Setup beside it. */
export const connectRoute = 'conectar';
export const setupRoute = 'configurar';
export const stageRoute = 'palco';
/** The old craft-home address; screens keep it only to redirect to the Stage. */
export const studioRoute = 'estudio';
export const configRoute = 'configuracao';
export const maestroRoute = 'maestro';
export const deviceRoute = 'dispositivo';
export const gkRoute = 'dispositivo/gk';

const base = '/gr55';
export const setupHref = `${base}/${setupRoute}`;
export const stageHref = `${base}/${stageRoute}`;
export const configHref = `${base}/${configRoute}`;
export const maestroHref = `${base}/${maestroRoute}`;
export const deviceHref = `${base}/${deviceRoute}`;
export const gkHref = `${base}/${gkRoute}`;

/** Child routes that may be restored after a silent reconnect. */
export const RESUMABLE_ROUTES = [
  stageRoute,
  maestroRoute,
  configRoute,
  deviceRoute,
  gkRoute,
  setupRoute,
] as const;

export type ResumableRoute = (typeof RESUMABLE_ROUTES)[number];

export function isResumableRoute(route: string): route is ResumableRoute {
  return (RESUMABLE_ROUTES as readonly string[]).includes(route);
}

/** First path segment under `/gr55/…` (handles nested `dispositivo/gk`). */
export function childRouteOfPath(pathname: string): string {
  const parts = pathname.replace(/^\/gr55\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'dispositivo' && parts[1] === 'gk') {
    return gkRoute;
  }
  return parts[0] ?? '';
}
