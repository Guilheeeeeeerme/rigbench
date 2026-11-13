/** GR-55 routes under /gr55. Surfaces: Connect · Patch workspace.
 *
 * Legacy addresses are represented by the literal redirect entries in Gr55Screen.tsx;
 * do not re-add first-class exports for them.
 */
export const connectRoute = 'conectar';
export const patchRoute = 'patch';

const base = '/gr55';
export const patchHref = `${base}/${patchRoute}`;

/** Child routes restored after silent reconnect. */
const RESUMABLE_ROUTES = [patchRoute] as const;

export type ResumableRoute = (typeof RESUMABLE_ROUTES)[number];

export function isResumableRoute(route: string): route is ResumableRoute {
  return (RESUMABLE_ROUTES as readonly string[]).includes(route as ResumableRoute);
}

/** First path segment under `/gr55/…`. */
export function childRouteOfPath(pathname: string): string {
  const parts = pathname
    .replace(/^\/gr55\/?/, '')
    .split('/')
    .filter(Boolean);
  return parts[0] ?? '';
}

/** Map legacy first segments onto the patch workspace. */
export function normalizeAppRoute(_child: string): ResumableRoute {
  return patchRoute;
}
