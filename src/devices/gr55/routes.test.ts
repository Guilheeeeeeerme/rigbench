import { describe, expect, test } from 'vitest';
import {
  childRouteOfPath,
  isResumableRoute,
  normalizeAppRoute,
  patchRoute,
} from './routes';

describe('GR-55 route helpers', () => {
  test('childRouteOfPath reads the segment under /gr55', () => {
    expect(childRouteOfPath('/gr55/patch')).toBe(patchRoute);
    expect(childRouteOfPath('/gr55/bank')).toBe('bank');
    expect(childRouteOfPath('/gr55')).toBe('');
  });

  test('isResumableRoute accepts Patch only', () => {
    expect(isResumableRoute('patch')).toBe(true);
    expect(isResumableRoute('bank')).toBe(false);
    expect(isResumableRoute('global')).toBe(false);
    expect(isResumableRoute('conectar')).toBe(false);
  });

  test('normalizeAppRoute maps every legacy address onto Patch', () => {
    expect(normalizeAppRoute('maestro')).toBe(patchRoute);
    expect(normalizeAppRoute('configuracao')).toBe(patchRoute);
    expect(normalizeAppRoute('bank')).toBe(patchRoute);
    expect(normalizeAppRoute('global')).toBe(patchRoute);
  });
});
