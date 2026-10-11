import { describe, expect, test } from 'vitest';
import {
  childRouteOfPath,
  globalRoute,
  isResumableRoute,
  normalizeAppRoute,
  patchRoute,
} from './routes';

describe('GR-55 route helpers', () => {
  test('childRouteOfPath reads the segment under /gr55', () => {
    expect(childRouteOfPath('/gr55/patch')).toBe(patchRoute);
    expect(childRouteOfPath('/gr55/global')).toBe(globalRoute);
    expect(childRouteOfPath('/gr55')).toBe('');
  });

  test('isResumableRoute accepts Patch and Global only', () => {
    expect(isResumableRoute('patch')).toBe(true);
    expect(isResumableRoute('global')).toBe(true);
    expect(isResumableRoute('conectar')).toBe(false);
    expect(isResumableRoute('palco')).toBe(false);
  });

  test('normalizeAppRoute maps legacy addresses', () => {
    expect(normalizeAppRoute('maestro')).toBe(patchRoute);
    expect(normalizeAppRoute('configuracao')).toBe(globalRoute);
    expect(normalizeAppRoute('dispositivo')).toBe(globalRoute);
    expect(normalizeAppRoute('patch')).toBe(patchRoute);
  });
});
