import { describe, expect, test } from 'vitest';
import {
  childRouteOfPath,
  gkRoute,
  isResumableRoute,
  maestroRoute,
  stageRoute,
} from './routes';

describe('GR-55 route helpers', () => {
  test('childRouteOfPath reads the segment under /gr55', () => {
    expect(childRouteOfPath('/gr55/palco')).toBe(stageRoute);
    expect(childRouteOfPath('/gr55/maestro')).toBe(maestroRoute);
    expect(childRouteOfPath('/gr55/dispositivo/gk')).toBe(gkRoute);
    expect(childRouteOfPath('/gr55')).toBe('');
  });

  test('isResumableRoute accepts app surfaces and rejects connect', () => {
    expect(isResumableRoute('palco')).toBe(true);
    expect(isResumableRoute('maestro')).toBe(true);
    expect(isResumableRoute('conectar')).toBe(false);
  });
});
