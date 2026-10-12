import { MidiTimeoutError } from '../../../midi/session';
import type { GkMode } from '../editor';
import { PATCH_BLOCKS } from '../patchLayout';
import { slotsOfMode } from '../slots';
import { checksumOf } from './cache';
import type { ChangedSlot, SlotRecord, SyncCache, SyncMeta } from './cache';

/** What the engine needs from the pedal. The editor is one; tests pass their own. */
export interface SyncSource {
  readonly gkMode: GkMode;
  readUserPatch(userPatchNumber: number): Promise<Uint8Array>;
  readUserPatchProbe(userPatchNumber: number): Promise<Uint8Array>;
  readSystemBytes(): Promise<Uint8Array>;
  nameOfPatch(patch: Uint8Array): string;
  countDifferences(a: Uint8Array, b: Uint8Array): number;
}

export type SyncPhase =
  /** Nothing read yet, or a sync was stopped before it finished. */
  | 'idle'
  | 'syncing'
  | 'paused'
  /** Every slot is in the cache and matched the pedal at the last sync. */
  | 'ready'
  /** Every slot is in the cache; the last sync found some that had changed on the pedal. */
  | 'changed'
  | 'failed';

export interface SyncState {
  phase: SyncPhase;
  done: number;
  total: number;
  /** The slot being read right now. */
  current?: number;
  /** Estimated time left, once a few slots have been timed. */
  etaMs?: number;
  finishedAt?: number;
  changed: readonly ChangedSlot[];
  /** How many slots this run had to read in full, rather than confirm with a probe. */
  fullReads: number;
  error?: unknown;
}

export interface SyncOptions {
  /** The pause before each slot read on a first sync. The engine shortens it as the pedal keeps up. */
  safePaceMs?: number;
  now?: () => number;
}

// gr55-remote's conservative pacing: 20 ms between messages. The session already keeps
// that gap after every reply; this is the extra margin a first sync starts with.
const SAFE_PACE_MS = 20;
const MAX_PACE_MS = 640;
// The shortest pause a timeout falls back to before doubling.
const MIN_BACKOFF_MS = 5;
// Reads in a row without a timeout before the pause is halved.
const SPEED_UP_AFTER = 8;
const RETRIES = 3;
// Slots timed for the estimate of the time left.
const ETA_WINDOW = 12;

const PROBE = PATCH_BLOCKS[0];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class Stopped extends Error {}

/**
 * Mirrors the pedal's user slots and system page into a local cache, one slot at a time.
 * The pedal never pushes its memory, so this polls: a first sync reads every slot in full,
 * a later one probes each slot and re-reads only those that no longer match. It never
 * writes to the pedal, and it can stop at any slot and pick up there later.
 */
export class SyncEngine {
  private readonly listeners = new Set<() => void>();
  private readonly records = new Map<number, SlotRecord>();
  private readonly safePaceMs: number;
  private readonly now: () => number;
  private state: SyncState = { phase: 'idle', done: 0, total: 0, changed: [], fullReads: 0 };
  private meta: SyncMeta | undefined;
  private loadedMode: GkMode | undefined;
  private recordsVersion = 0;
  private running: Promise<void> | undefined;
  private stopRequested = false;
  private pauseRequested = false;
  private resumeWaiters: (() => void)[] = [];
  private disposed = false;

  constructor(
    private readonly source: SyncSource,
    private readonly cache: SyncCache,
    options: SyncOptions = {},
  ) {
    this.safePaceMs = options.safePaceMs ?? SAFE_PACE_MS;
    this.now = options.now ?? Date.now;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** The progress of the sync. A new object whenever anything in it changes. */
  snapshot = (): SyncState => this.state;

  /** Changes whenever a cached slot does. */
  slotsSnapshot = (): number => this.recordsVersion;

  /** A slot as last read from the pedal, if sync has reached it. */
  slot(userPatchNumber: number): SlotRecord | undefined {
    return this.records.get(userPatchNumber);
  }

  get systemBytes(): Uint8Array | undefined {
    return this.meta?.system;
  }

  /** The pause between slot reads the engine has settled on, in milliseconds. */
  get paceMs(): number {
    return this.meta?.paceMs ?? this.safePaceMs;
  }

  /** Loads what earlier visits cached, so screens have names before the pedal is read. */
  async load(): Promise<void> {
    const mode = this.source.gkMode;
    if (this.loadedMode === mode) {
      return;
    }
    const [records, meta] = await Promise.all([
      this.cache.loadSlots(mode),
      this.cache.loadMeta(mode),
    ]);
    this.records.clear();
    for (const record of records) {
      this.records.set(record.userPatchNumber, record);
    }
    this.meta = meta;
    this.loadedMode = mode;
    this.recordsVersion++;
    const total = slotsOfMode(mode).length;
    const complete = meta?.complete === true;
    this.setState({
      phase: complete ? (meta.changed.length > 0 ? 'changed' : 'ready') : 'idle',
      done: complete ? total : this.confirmedIn(meta?.run),
      total,
      changed: meta?.changed ?? [],
      finishedAt: meta?.finishedAt,
      fullReads: 0,
      current: undefined,
      etaMs: undefined,
      error: undefined,
    });
  }

  /**
   * Starts a sync, or picks up the one that was interrupted. With `full`, every slot is
   * read again whatever the cache holds.
   */
  start({ full = false }: { full?: boolean } = {}): Promise<void> {
    if (this.pauseRequested) {
      this.resume();
    }
    this.running ??= this.run(full).finally(() => {
      this.running = undefined;
    });
    return this.running;
  }

  pause(): void {
    if (this.state.phase === 'syncing') {
      this.pauseRequested = true;
      this.setState({ phase: 'paused', current: undefined, etaMs: undefined });
    }
  }

  resume(): void {
    if (!this.pauseRequested) {
      return;
    }
    this.pauseRequested = false;
    if (this.running && !this.stopRequested) {
      this.setState({ phase: 'syncing' });
    }
    const waiters = this.resumeWaiters;
    this.resumeWaiters = [];
    waiters.forEach((wake) => wake());
  }

  /** Stops the sync where it is. What was read stays cached; start() continues from there. */
  async cancel(): Promise<void> {
    if (!this.running) {
      return;
    }
    this.stopRequested = true;
    this.resume();
    await this.running;
  }

  /**
   * Runs an action that saves to the pedal with the sync held still: the pedal goes deaf
   * for seconds while it saves, and reads sent meanwhile would time out.
   */
  async exclusive<T>(action: () => Promise<T>): Promise<T> {
    const wasRunning = this.running !== undefined;
    await this.cancel();
    try {
      return await action();
    } finally {
      if (wasRunning && !this.disposed) {
        void this.start();
      }
    }
  }

  /** Clears the list of slots the last sync found changed, once the musician has seen it. */
  async acknowledgeChanges(): Promise<void> {
    if (!this.meta || this.state.phase !== 'changed') {
      return;
    }
    this.meta = { ...this.meta, changed: [] };
    await this.cache.putMeta(this.meta);
    this.setState({ phase: 'ready', changed: [] });
  }

  dispose(): void {
    this.disposed = true;
    this.stopRequested = true;
    this.resume();
    this.listeners.clear();
  }

  private confirmedIn(run: number | undefined): number {
    if (run === undefined) {
      return 0;
    }
    let count = 0;
    for (const record of this.records.values()) {
      if (record.run === run && !record.stale) {
        count++;
      }
    }
    return count;
  }

  private async run(full: boolean): Promise<void> {
    this.stopRequested = false;
    try {
      // A mode switch remakes the slot list: the other mode has its own cache.
      if (this.loadedMode !== this.source.gkMode) {
        this.loadedMode = undefined;
      }
      await this.load();
      const mode = this.source.gkMode;
      const slots = slotsOfMode(mode);
      const resuming = this.meta !== undefined && !this.meta.complete && !full;
      const meta: SyncMeta = resuming
        ? this.meta!
        : {
            mode,
            run: (this.meta?.run ?? 0) + 1,
            complete: false,
            changed: [],
            paceMs: this.meta?.paceMs,
            system: this.meta?.system,
          };
      this.meta = meta;
      const pending = slots.filter((slot) => {
        const record = this.records.get(slot.userPatchNumber);
        return !record || record.stale || record.run !== meta.run;
      });
      this.setState({
        phase: 'syncing',
        done: slots.length - pending.length,
        total: slots.length,
        changed: meta.changed,
        finishedAt: undefined,
        fullReads: 0,
        error: undefined,
      });
      await this.cache.putMeta(meta);
      const pace = { ms: meta.paceMs ?? this.safePaceMs, streak: 0 };
      meta.system = await this.paced(pace, () => this.source.readSystemBytes());

      const timings: number[] = [];
      for (const slot of pending) {
        await this.gate();
        const startedAt = this.now();
        this.setState({ current: slot.userPatchNumber });
        await this.paced(pace, () => this.syncSlot(slot.userPatchNumber, meta, full));
        meta.paceMs = pace.ms;
        timings.push(this.now() - startedAt);
        if (timings.length > ETA_WINDOW) {
          timings.shift();
        }
        const done = this.state.done + 1;
        const average = timings.reduce((sum, ms) => sum + ms, 0) / timings.length;
        this.setState({
          done,
          etaMs: timings.length >= 3 ? Math.round(average * (slots.length - done)) : undefined,
        });
      }

      meta.complete = true;
      meta.finishedAt = this.now();
      await this.cache.putMeta(meta);
      this.setState({
        phase: meta.changed.length > 0 ? 'changed' : 'ready',
        done: slots.length,
        current: undefined,
        etaMs: undefined,
        finishedAt: meta.finishedAt,
        changed: meta.changed,
      });
    } catch (error) {
      if (this.meta) {
        // Keep the run open, so the next start continues instead of starting over.
        await this.cache.putMeta(this.meta).catch(() => {});
      }
      if (error instanceof Stopped) {
        this.setState({ phase: 'idle', current: undefined, etaMs: undefined });
      } else {
        this.setState({ phase: 'failed', current: undefined, etaMs: undefined, error });
      }
    }
  }

  /**
   * Runs one read at the current pace. A timeout doubles the pause and tries again; a
   * run of clean reads halves it, so the sync settles at what this pedal keeps up with.
   */
  private async paced<T>(pace: { ms: number; streak: number }, read: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        if (pace.ms > 0) {
          await delay(pace.ms);
        }
        const result = await read();
        if (++pace.streak >= SPEED_UP_AFTER) {
          pace.ms = Math.floor(pace.ms / 2);
          pace.streak = 0;
        }
        return result;
      } catch (error) {
        if (!(error instanceof MidiTimeoutError) || attempt >= RETRIES) {
          throw error;
        }
        pace.ms = Math.min(MAX_PACE_MS, Math.max(this.safePaceMs, MIN_BACKOFF_MS, pace.ms) * 2);
        pace.streak = 0;
      }
    }
  }

  /** Waits while paused; ends the run when it was stopped. */
  private async gate(): Promise<void> {
    while (this.pauseRequested && !this.stopRequested) {
      await new Promise<void>((resolve) => this.resumeWaiters.push(resolve));
    }
    if (this.stopRequested) {
      throw new Stopped();
    }
  }

  private async syncSlot(userPatchNumber: number, meta: SyncMeta, full: boolean): Promise<void> {
    const known = this.records.get(userPatchNumber);
    if (known && !known.stale && !full) {
      const probe = await this.source.readUserPatchProbe(userPatchNumber);
      const end = PROBE.offset + PROBE.length;
      if (checksumOf(probe) === checksumOf(known.bytes, PROBE.offset, end)) {
        known.run = meta.run;
        await this.cache.putSlot(known);
        return;
      }
    }
    const bytes = await this.source.readUserPatch(userPatchNumber);
    this.setState({ fullReads: this.state.fullReads + 1 });
    if (known && !known.stale && checksumOf(bytes) !== known.checksum) {
      meta.changed = [
        ...meta.changed.filter((entry) => entry.userPatchNumber !== userPatchNumber),
        {
          userPatchNumber,
          before: known.name,
          after: this.source.nameOfPatch(bytes),
          parameters: this.source.countDifferences(known.bytes, bytes),
        },
      ];
      await this.cache.putMeta(meta);
      this.setState({ changed: meta.changed });
    }
    await this.store(userPatchNumber, bytes, meta.run);
  }

  private async store(userPatchNumber: number, bytes: Uint8Array, run: number): Promise<void> {
    const record: SlotRecord = {
      mode: this.source.gkMode,
      userPatchNumber,
      name: this.source.nameOfPatch(bytes),
      bytes,
      checksum: checksumOf(bytes),
      run,
      readAt: this.now(),
    };
    this.records.set(userPatchNumber, record);
    this.recordsVersion++;
    await this.cache.putSlot(record);
    this.notify();
  }

  private setState(change: Partial<SyncState>): void {
    this.state = { ...this.state, ...change };
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
