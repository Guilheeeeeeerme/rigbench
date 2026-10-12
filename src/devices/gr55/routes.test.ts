import { describe, expect, test } from 'vitest';
import {
  bankRoute,
  childRouteOfPath,
  globalRoute,
  isResumableRoute,
  normalizeAppRoute,
} from './routes';

describe('GR-55 route helpers', () => {
  test('childRouteOfPath reads the segment under /gr55', () => {
    expect(childRouteOfPath('/gr55/bank')).toBe(bankRoute);
    expect(childRouteOfPath('/gr55/global')).toBe(globalRoute);
    expect(childRouteOfPath('/gr55')).toBe('');
  });

  test('isResumableRoute accepts Bank and Global only', () => {
    expect(isResumableRoute('bank')).toBe(true);
    expect(isResumableRoute('global')).toBe(true);
    expect(isResumableRoute('patch')).toBe(false);
    expect(isResumableRoute('conectar')).toBe(false);
    expect(isResumableRoute('palco')).toBe(false);
  });

  test('normalizeAppRoute maps legacy addresses onto Bank or Global', () => {
    expect(normalizeAppRoute('maestro')).toBe(bankRoute);
    expect(normalizeAppRoute('configuracao')).toBe(globalRoute);
    expect(normalizeAppRoute('dispositivo')).toBe(globalRoute);
    expect(normalizeAppRoute('patch')).toBe(bankRoute);
    expect(normalizeAppRoute('bank')).toBe(bankRoute);
  });
});
