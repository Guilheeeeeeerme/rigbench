import { describe, expect, test } from 'vitest';
import {
  MismatchError,
  OperationQueue,
  QueueBlockedError,
  QueueTimeoutError,
} from './operationQueue';

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('operation queue', () => {
  test('runs one operation at a time', async () => {
    const queue = new OperationQueue(1000);
    const order: string[] = [];
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const first = queue.run('apply', 'first', async () => {
      order.push('first-start');
      await gate;
      order.push('first-end');
    });
    const second = queue.run('apply', 'second', async () => {
      order.push('second');
    });
    await wait(20);
    expect(order).toEqual(['first-start']);
    release();
    await Promise.all([first, second]);
    expect(order).toEqual(['first-start', 'first-end', 'second']);
  });

  test('a late reply blocks further writes and a read can recover', async () => {
    const queue = new OperationQueue(30);
    await expect(queue.run('apply', 'slow', () => wait(80))).rejects.toBeInstanceOf(
      QueueTimeoutError,
    );
    expect(queue.snapshot().phase).toBe('uncertain');
    expect(queue.snapshot().blocked).toBe(true);
    await expect(queue.run('apply', 'next', async () => undefined)).rejects.toBeInstanceOf(
      QueueBlockedError,
    );
    await queue.run('read', 'recover', async () => undefined);
    expect(queue.snapshot().blocked).toBe(false);
    expect(queue.snapshot().phase).toBe('idle');
  });

  test('a mismatch blocks until a later read', async () => {
    const queue = new OperationQueue(1000);
    await expect(
      queue.run('save', 'save', async () => Promise.reject(new MismatchError())),
    ).rejects.toBeInstanceOf(MismatchError);
    expect(queue.snapshot()).toMatchObject({
      phase: 'uncertain',
      detail: 'mismatch',
      blocked: true,
    });
    await expect(queue.run('apply', 'again', async () => undefined)).rejects.toBeInstanceOf(
      QueueBlockedError,
    );
  });
});
