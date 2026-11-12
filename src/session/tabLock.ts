const LOCK_NAME = 'rigbench-writer';

let releaseHold: (() => void) | undefined;

/**
 * One writing session per origin. Other tabs of this app stay out.
 * A program outside the browser can still edit the pedal.
 */
export async function acquireWriterLock(): Promise<'acquired' | 'blocked'> {
  if (releaseHold) return 'acquired';
  const locks = globalThis.navigator?.locks;
  if (!locks) return 'acquired';
  return new Promise((resolve) => {
    void locks.request(LOCK_NAME, { mode: 'exclusive', ifAvailable: true }, (lock) => {
      if (!lock) {
        resolve('blocked');
        return undefined;
      }
      resolve('acquired');
      return new Promise<void>((done) => {
        releaseHold = () => {
          releaseHold = undefined;
          done();
        };
      });
    });
  });
}

export function releaseWriterLock(): void {
  releaseHold?.();
}
