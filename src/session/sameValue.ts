/** Compare a value we asked for with the value the device decoded on readback. */
export function sameValue(expected: unknown, actual: unknown): boolean {
  if (typeof expected === 'number' && typeof actual === 'number') {
    return Math.abs(expected - actual) < 1e-6;
  }
  return expected === actual;
}
