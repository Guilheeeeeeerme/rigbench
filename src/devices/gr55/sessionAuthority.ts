/**
 * App vs pedal authority for the two-page editor.
 *
 * While an app write / snapshot is in flight, trust the app (ignore pedal churn).
 * When idle, mirror the pedal.
 */

export type Authority = 'app' | 'pedal';

let authority: Authority = 'pedal';
let snapshotInFlight: Promise<void> | undefined;
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
  await source.loadSystem();
  await source.readSystem();
  await source.readPatch();
  await source.readPatchLocation();
}

/**
 * Run an app-originated mutation under app authority, then refresh the full
 * snapshot. Concurrent calls share one trailing snapshot.
 */
export async function runAppMutation(
  mutate: () => void | Promise<void>,
  source: SnapshotSource,
): Promise<void> {
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
}

/** Manual “Request snapshot” — briefly holds app authority so polls do not race. */
export async function requestSnapshot(source: SnapshotSource): Promise<void> {
  return runAppMutation(() => undefined, source);
}
