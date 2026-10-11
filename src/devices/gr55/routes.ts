/** GR-55 routes under /gr55. Surfaces: Connect · Patch · Global. */
export const connectRoute = 'conectar';
export const patchRoute = 'patch';
export const globalRoute = 'global';

/** @deprecated Legacy Stage address — redirects to Patch. */
export const stageRoute = patchRoute;
/** @deprecated Legacy Studio address — redirects to Patch. */
export const studioRoute = 'estudio';
/** @deprecated Legacy Setup address — redirects to Global. */
export const configRoute = 'configuracao';
/** @deprecated Legacy Maestro address — redirects to Patch. */
export const maestroRoute = 'maestro';
/** @deprecated Legacy wizard — redirects to Connect. */
export const setupRoute = 'configurar';
/** @deprecated Legacy device — redirects to Global. */
export const deviceRoute = 'dispositivo';
/** @deprecated Legacy GK — redirects to Global. */
export const gkRoute = 'dispositivo/gk';

const base = '/gr55';
export const connectHref = `${base}/${connectRoute}`;
export const patchHref = `${base}/${patchRoute}`;
export const globalHref = `${base}/${globalRoute}`;
/** @deprecated Use patchHref. */
export const stageHref = patchHref;
/** @deprecated Use globalHref. */
export const configHref = globalHref;
/** @deprecated Use patchHref. */
export const maestroHref = patchHref;
/** @deprecated Use globalHref. */
export const deviceHref = globalHref;
/** @deprecated Use globalHref. */
export const gkHref = globalHref;
/** @deprecated Use connectHref. */
export const setupHref = connectHref;

/** Child routes restored after silent reconnect. */
export const RESUMABLE_ROUTES = [patchRoute, globalRoute] as const;

export type ResumableRoute = (typeof RESUMABLE_ROUTES)[number];

export function isResumableRoute(route: string): route is ResumableRoute {
  return (RESUMABLE_ROUTES as readonly string[]).includes(route as ResumableRoute);
}

/** First path segment under `/gr55/…`. */
export function childRouteOfPath(pathname: string): string {
  const parts = pathname.replace(/^\/gr55\/?/, '').split('/').filter(Boolean);
  return parts[0] ?? '';
}

/** Map legacy first segments onto Patch or Global. */
export function normalizeAppRoute(child: string): ResumableRoute {
  if (child === globalRoute || child === configRoute || child === 'dispositivo') {
    return globalRoute;
  }
  return patchRoute;
}
