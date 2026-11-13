/**
 * One serial operation at a time. A failed or timed-out operation blocks
 * further writes until the caller reads the device again.
 *
 * The timeout is a provisional ceiling, not a measured pedal limit.
 */
const UNMEASURED_TIMEOUT_MS = 12_000;

/** How long a confirmed reading stays fresh enough to edit. Not measured on hardware. */
const UNMEASURED_STALE_MS = 20_000;

export type OperationKind = 'read' | 'apply' | 'save';

export type OperationPhase =
  'idle' | 'reading' | 'applying' | 'applied' | 'saving' | 'saved' | 'verifying' | 'uncertain';

export class QueueTimeoutError extends Error {
  constructor() {
    super('timeout');
    this.name = 'QueueTimeoutError';
  }
}

export class MismatchError extends Error {
  constructor() {
    super('mismatch');
    this.name = 'MismatchError';
  }
}

export class QueueBlockedError extends Error {
  constructor() {
    super('blocked');
    this.name = 'QueueBlockedError';
  }
}

export interface QueueSnapshot {
  phase: OperationPhase;
  detail: string;
  blocked: boolean;
  lastVerifiedAt: number | null;
}

type Listener = () => void;

export class OperationQueue {
  private tail: Promise<void> = Promise.resolve();
  private phase: OperationPhase = 'idle';
  private detail = '';
  private blocked = false;
  private lastVerifiedAt: number | null = null;
  private readonly listeners = new Set<Listener>();

  constructor(private readonly timeoutMs = UNMEASURED_TIMEOUT_MS) {}

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  snapshot(): QueueSnapshot {
    return {
      phase: this.phase,
      detail: this.detail,
      blocked: this.blocked,
      lastVerifiedAt: this.lastVerifiedAt,
    };
  }

  stale(now = Date.now()): boolean {
    if (this.lastVerifiedAt == null) return true;
    return now - this.lastVerifiedAt > UNMEASURED_STALE_MS;
  }

  unblock(): void {
    this.blocked = false;
    this.publish();
  }

  markUncertain(detail: string): void {
    this.blocked = true;
    this.phase = 'uncertain';
    this.detail = detail;
    this.publish();
  }

  touchVerified(now = Date.now()): void {
    this.lastVerifiedAt = now;
    this.publish();
  }

  run<T>(kind: OperationKind, detail: string, work: () => Promise<T>): Promise<T> {
    if (this.blocked && kind !== 'read') {
      return Promise.reject(new QueueBlockedError());
    }
    const job = this.tail.then(async () => {
      this.phase = kind === 'read' ? 'verifying' : kind === 'save' ? 'saving' : 'applying';
      this.detail = detail;
      this.publish();
      try {
        const result = await withTimeout(work(), this.timeoutMs);
        this.lastVerifiedAt = Date.now();
        this.phase = kind === 'read' ? 'idle' : kind === 'save' ? 'saved' : 'applied';
        this.detail = detail;
        this.blocked = false;
        this.publish();
        return result;
      } catch (error) {
        this.blocked = true;
        this.phase = 'uncertain';
        this.detail =
          error instanceof QueueTimeoutError
            ? 'timeout'
            : error instanceof MismatchError
              ? 'mismatch'
              : 'failed';
        this.publish();
        throw error;
      }
    });
    this.tail = job.then(
      () => undefined,
      () => undefined,
    );
    return job;
  }

  private publish(): void {
    for (const listener of this.listeners) listener();
  }
}

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new QueueTimeoutError()), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
