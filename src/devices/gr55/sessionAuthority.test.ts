import { beforeEach, describe, expect, it } from 'vitest';
import {
  getAuthority,
  isPedalAuthority,
  readFullSnapshot,
  runAppMutation,
  syncFromPedal,
} from './sessionAuthority';

describe('sessionAuthority', () => {
  beforeEach(async () => {
    // Drain any in-flight work from a prior test.
    await runAppMutation(() => undefined, {
      loadSystem: async () => undefined,
      readSystem: async () => undefined,
      readPatch: async () => undefined,
      readPatchLocation: async () => undefined,
    });
  });

  it('starts as pedal authority after a snapshot settles', () => {
    expect(getAuthority()).toBe('pedal');
    expect(isPedalAuthority()).toBe(true);
  });

  it('holds app authority during mutation then returns to pedal', async () => {
    const order: string[] = [];
    await runAppMutation(
      () => {
        order.push(`mutate:${getAuthority()}`);
      },
      {
        loadSystem: async () => {
          order.push(`loadSystem:${getAuthority()}`);
        },
        readSystem: async () => {
          order.push('readSystem');
        },
        readPatch: async () => {
          order.push('readPatch');
        },
        readPatchLocation: async () => {
          order.push('readPatchLocation');
        },
      },
    );
    expect(order[0]).toBe('mutate:app');
    expect(order).toContain('loadSystem:app');
    expect(order).toContain('readPatch');
    expect(getAuthority()).toBe('pedal');
  });

  it('readFullSnapshot hits every source', async () => {
    const hits: string[] = [];
    await readFullSnapshot({
      loadSystem: async () => {
        hits.push('loadSystem');
      },
      readSystem: async () => {
        hits.push('readSystem');
      },
      readPatch: async () => {
        hits.push('readPatch');
      },
      readPatchLocation: async () => {
        hits.push('readPatchLocation');
      },
    });
    expect(hits).toEqual(['loadSystem', 'readSystem', 'readPatch', 'readPatchLocation']);
  });

  it('serializes concurrent mutations', async () => {
    const order: string[] = [];
    const source = {
      loadSystem: async () => {
        order.push('snap');
      },
      readSystem: async () => undefined,
      readPatch: async () => undefined,
      readPatchLocation: async () => undefined,
    };
    const a = runAppMutation(async () => {
      order.push('a-start');
      await new Promise((r) => setTimeout(r, 20));
      order.push('a-end');
    }, source);
    const b = runAppMutation(() => {
      order.push('b');
    }, source);
    await Promise.all([a, b]);
    expect(order.indexOf('a-end')).toBeLessThan(order.indexOf('b'));
  });

  it('syncFromPedal runs reloadWorkingCopy before the trailing snapshot', async () => {
    const hits: string[] = [];
    await syncFromPedal(
      {
        loadSystem: async () => {
          hits.push('loadSystem');
        },
        readSystem: async () => {
          hits.push('readSystem');
        },
        readPatch: async () => {
          hits.push('readPatch');
        },
        readPatchLocation: async () => {
          hits.push('readPatchLocation');
        },
      },
      async () => {
        hits.push('reloadWorkingCopy');
      },
    );
    expect(hits[0]).toBe('reloadWorkingCopy');
    expect(hits.slice(1)).toEqual([
      'loadSystem',
      'readSystem',
      'readPatch',
      'readPatchLocation',
    ]);
    expect(getAuthority()).toBe('pedal');
  });
});
