/**
 * App vs pedal authority for the patch workspace.
 *
 * While an app write / snapshot is in flight, trust the app (ignore pedal churn).
 * When idle, mirror the pedal.
 *
 * Mutations enqueue serially so concurrent UI actions are not dropped.
 */

export type Authority = 'app' | 'pedal';

let authority: Authority = 'pedal';
let snapshotInFlight: Promise<void> | undefined;
let mutationTail: Promise<void> = Promise.resolve();
/** Bumps on every snapshot start; late snapshots no-op when superseded. */
let snapshotGeneration = 0;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function getAuthority(): Authority {
  return authority;
}

export function isPedalAuthority(): boolean {
  return authority === 'pedal';
}

export function getSnapshotGeneration(): number {
  return snapshotGeneration;
}

export function subscribeAuthority(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function setAuthority(next: Authority): void {
  if (authority === next) {
    return;
  }
  authority = next;
  notify();
}

export interface SnapshotSource {
  readSystem(): Promise<void>;
  readPatch(): Promise<void>;
  readPatchLocation(): Promise<void>;
  /** Pedal-wide mirror reload (Gr55System.load). */
  loadSystem(): Promise<void>;
}

/** Full board snapshot: system + temp patch + slot location. */
export async function readFullSnapshot(source: SnapshotSource): Promise<void> {
  const generation = ++snapshotGeneration;
  await source.loadSystem();
  if (generation !== snapshotGeneration) {
    return;
  }
  await source.readSystem();
  if (generation !== snapshotGeneration) {
    return;
  }
  await source.readPatch();
  if (generation !== snapshotGeneration) {
    return;
  }
  await source.readPatchLocation();
}

/**
 * Run an app-originated mutation under app authority, then refresh the full
 * snapshot. Concurrent calls run serially (mutate + trailing snapshot each).
 */
export async function runAppMutation(
  mutate: () => void | Promise<void>,
  source: SnapshotSource,
): Promise<void> {
  const run = async () => {
    setAuthority('app');
    try {
      await mutate();
    } finally {
      let work!: Promise<void>;
      work = (async () => {
        try {
          await readFullSnapshot(source);
        } finally {
          if (snapshotInFlight === work) {
            snapshotInFlight = undefined;
            setAuthority('pedal');
          }
        }
      })();
      snapshotInFlight = work;
      await work;
    }
  };

  const next = mutationTail.then(run, run);
  mutationTail = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

/**
 * Manual Sync from the pedal.
 *
 * Re-reads system + temporary patch + location. When `reloadWorkingCopy` is
 * provided, the sounding buffer is replaced with what USER memory has persisted.
 */
export async function syncFromPedal(
  source: SnapshotSource,
  reloadWorkingCopy?: () => void | Promise<void>,
): Promise<void> {
  return runAppMutation(async () => {
    if (reloadWorkingCopy) {
      await reloadWorkingCopy();
    }
  }, source);
}

/** @deprecated use syncFromPedal */
export async function requestSnapshot(source: SnapshotSource): Promise<void> {
  return syncFromPedal(source);
}
