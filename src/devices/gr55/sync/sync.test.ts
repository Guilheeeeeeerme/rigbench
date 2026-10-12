import { afterEach, describe, expect, test, vi } from 'vitest';
import { MidiSession, MidiTimeoutError } from '../../../midi/session';
import { RolandGR55SysExConfig } from '../../../protocol/RolandDevices';
import { Gr55Editor } from '../editor';
import type { GkMode } from '../editor';
import { FakeGr55 } from '../fakeDevice';
import { PATCH_BLOCKS, PATCH_SPAN, USER_PATCH_COUNT } from '../patchLayout';
import { MemorySyncCache, checksumOf } from './cache';
import { SyncEngine } from './engine';
import type { SyncSource } from './engine';

const NAME_OFFSET = 0;
const PROBE = PATCH_BLOCKS[0];

/** A pedal reduced to what sync asks of it, answering at once and counting the reads. */
class StubPedal implements SyncSource {
  gkMode: GkMode = 'GUITAR';
  readonly slots = new Map<number, Uint8Array>();
  fullReads = 0;
  probes = 0;
  /** Reads that fail with a timeout before the pedal answers again. */
  timeouts = 0;
  onRead: ((userPatchNumber: number) => void) | undefined;

  image(userPatchNumber: number): Uint8Array {
    let bytes = this.slots.get(userPatchNumber);
    if (!bytes) {
      bytes = new Uint8Array(PATCH_SPAN);
      bytes[NAME_OFFSET] = 0x41 + (userPatchNumber % 26);
      bytes[PATCH_SPAN - 1] = userPatchNumber % 128;
      this.slots.set(userPatchNumber, bytes);
    }
    return bytes;
  }

  private answer(): void {
    if (this.timeouts > 0) {
      this.timeouts--;
      throw new MidiTimeoutError('Data request');
    }
  }

  async readUserPatch(userPatchNumber: number): Promise<Uint8Array> {
    this.answer();
    this.fullReads++;
    this.onRead?.(userPatchNumber);
    return this.image(userPatchNumber).slice();
  }

  async readUserPatchProbe(userPatchNumber: number): Promise<Uint8Array> {
    this.answer();
    this.probes++;
    return this.image(userPatchNumber).slice(PROBE.offset, PROBE.offset + PROBE.length);
  }

  async readSystemBytes(): Promise<Uint8Array> {
    return Uint8Array.of(this.gkMode === 'BASS' ? 1 : 0);
  }

  nameOfPatch(patch: Uint8Array): string {
    return String.fromCharCode(patch[NAME_OFFSET]);
  }

  countDifferences(a: Uint8Array, b: Uint8Array): number {
    return a.reduce((count, byte, index) => count + (byte === b[index] ? 0 : 1), 0);
  }
}

function setUp(pedal = new StubPedal(), cache = new MemorySyncCache()) {
  return { pedal, cache, engine: new SyncEngine(pedal, cache, { safePaceMs: 0 }) };
}

describe('checksumOf', () => {
  test('tells two images apart and is stable for one', () => {
    const a = Uint8Array.of(1, 2, 3);
    expect(checksumOf(a)).toBe(checksumOf(Uint8Array.of(1, 2, 3)));
    expect(checksumOf(a)).not.toBe(checksumOf(Uint8Array.of(1, 2, 4)));
    expect(checksumOf(Uint8Array.of(9, 1, 2, 3, 9), 1, 4)).toBe(checksumOf(a));
  });
});

describe('SyncEngine', () => {
  test('a first sync reads all 297 slots and the system page, then is ready', async () => {
    const { pedal, engine } = setUp();
    const seen: number[] = [];
    engine.subscribe(() => seen.push(engine.snapshot().done));
    await engine.start();

    const state = engine.snapshot();
    expect(state.phase).toBe('ready');
    expect(state.done).toBe(USER_PATCH_COUNT);
    expect(state.total).toBe(USER_PATCH_COUNT);
    expect(state.finishedAt).toBeTypeOf('number');
    expect(pedal.fullReads).toBe(USER_PATCH_COUNT);
    expect(pedal.probes).toBe(0);
    expect(engine.slot(0)?.name).toBe('A');
    expect(engine.systemBytes).toEqual(Uint8Array.of(0));
    // Progress only ever moves forward.
    expect(seen).toEqual([...seen].sort((a, b) => a - b));
  });

  test('a second sync probes every slot and reads none when nothing changed', async () => {
    const { pedal, cache, engine } = setUp();
    await engine.start();
    pedal.fullReads = 0;

    const later = new SyncEngine(pedal, cache, { safePaceMs: 0 });
    await later.start();
    expect(later.snapshot().phase).toBe('ready');
    expect(later.snapshot().fullReads).toBe(0);
    expect(pedal.fullReads).toBe(0);
    expect(pedal.probes).toBe(USER_PATCH_COUNT);
  });

  test('a second sync reads only the slots that changed and lists them', async () => {
    const { pedal, cache, engine } = setUp();
    await engine.start();
    pedal.fullReads = 0;
    for (const userPatchNumber of [3, 40, 296]) {
      pedal.image(userPatchNumber)[NAME_OFFSET] = 0x7a;
    }

    const later = new SyncEngine(pedal, cache, { safePaceMs: 0 });
    await later.start();
    const state = later.snapshot();
    expect(state.phase).toBe('changed');
    expect(pedal.fullReads).toBe(3);
    expect(state.changed.map((entry) => entry.userPatchNumber)).toEqual([3, 40, 296]);
    expect(state.changed[0]).toMatchObject({ before: 'D', after: 'z', parameters: 1 });
    expect(later.slot(40)?.name).toBe('z');

    await later.acknowledgeChanges();
    expect(later.snapshot().phase).toBe('ready');
    expect(later.snapshot().changed).toEqual([]);
  });

  test('the list of changed slots survives a reload until it is acknowledged', async () => {
    const { pedal, cache, engine } = setUp();
    await engine.start();
    pedal.image(7)[NAME_OFFSET] = 0x7a;
    await new SyncEngine(pedal, cache, { safePaceMs: 0 }).start();

    const reloaded = new SyncEngine(pedal, cache, { safePaceMs: 0 });
    await reloaded.load();
    expect(reloaded.snapshot().phase).toBe('changed');
    expect(reloaded.snapshot().changed).toHaveLength(1);
  });

  test('a sync that was cut short picks up where it stopped', async () => {
    const { pedal, cache, engine } = setUp();
    pedal.onRead = (userPatchNumber) => {
      if (userPatchNumber === 99) {
        void engine.cancel();
      }
    };
    await engine.start();
    expect(engine.snapshot().phase).toBe('idle');
    const readBefore = pedal.fullReads;
    expect(readBefore).toBe(100);
    pedal.onRead = undefined;

    // As after a page reload: a new engine over the same cache.
    const reloaded = new SyncEngine(pedal, cache, { safePaceMs: 0 });
    await reloaded.load();
    expect(reloaded.snapshot()).toMatchObject({ phase: 'idle', done: 100 });
    expect(reloaded.slot(50)?.name).toBe(String.fromCharCode(0x41 + (50 % 26)));

    await reloaded.start();
    expect(reloaded.snapshot().phase).toBe('ready');
    expect(pedal.fullReads).toBe(USER_PATCH_COUNT);
    // The slots read before the cut were not asked for again, not even with a probe.
    expect(pedal.probes).toBe(0);
  });

  test('pausing holds the sync at the next slot and resuming finishes it', async () => {
    const { pedal, engine } = setUp();
    pedal.onRead = (userPatchNumber) => {
      if (userPatchNumber === 9) {
        engine.pause();
      }
    };
    const running = engine.start();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(engine.snapshot().phase).toBe('paused');
    expect(pedal.fullReads).toBe(10);

    engine.resume();
    await running;
    expect(engine.snapshot().phase).toBe('ready');
  });

  test('a timeout slows the pace and retries the same slot', async () => {
    const { pedal, engine } = setUp();
    pedal.timeouts = 2;
    await engine.start();
    expect(engine.snapshot().phase).toBe('ready');
    expect(pedal.fullReads).toBe(USER_PATCH_COUNT);
  });

  test('a pedal that stops answering fails the sync, which then resumes', async () => {
    const { pedal, engine } = setUp();
    pedal.onRead = (userPatchNumber) => {
      if (userPatchNumber === 19) {
        pedal.timeouts = 10;
      }
    };
    await engine.start();
    expect(engine.snapshot().phase).toBe('failed');
    expect(engine.snapshot().error).toBeInstanceOf(MidiTimeoutError);
    expect(engine.snapshot().done).toBe(20);

    pedal.onRead = undefined;
    pedal.timeouts = 0;
    await engine.start();
    expect(engine.snapshot().phase).toBe('ready');
    expect(pedal.fullReads).toBe(USER_PATCH_COUNT);
  });

  test('a full sync reads every slot again whatever the cache holds', async () => {
    const { pedal, engine } = setUp();
    await engine.start();
    pedal.fullReads = 0;
    await engine.start({ full: true });
    expect(pedal.fullReads).toBe(USER_PATCH_COUNT);
    expect(engine.snapshot().phase).toBe('ready');
  });

  test('saving to the pedal holds the sync, then lets it finish', async () => {
    const { pedal, engine } = setUp();
    let readsDuringSave = -1;
    pedal.onRead = (userPatchNumber) => {
      if (userPatchNumber === 4) {
        pedal.onRead = undefined;
        void engine.exclusive(async () => {
          const before = pedal.fullReads;
          await new Promise((resolve) => setTimeout(resolve, 20));
          readsDuringSave = pedal.fullReads - before;
        });
      }
    };
    await engine.start();
    await new Promise((resolve) => setTimeout(resolve, 60));
    await engine.start();
    expect(readsDuringSave).toBe(0);
    expect(engine.snapshot().phase).toBe('ready');
  });

  test('each GK mode keeps its own cache', async () => {
    const { pedal, cache, engine } = setUp();
    await engine.start();
    pedal.gkMode = 'BASS';
    pedal.fullReads = 0;
    await engine.start();
    expect(pedal.fullReads).toBe(USER_PATCH_COUNT);
    expect((await cache.loadSlots('GUITAR')).length).toBe(USER_PATCH_COUNT);
    expect((await cache.loadSlots('BASS')).length).toBe(USER_PATCH_COUNT);
  });
});

describe('sync against the simulated pedal', () => {
  afterEach(() => vi.useRealTimers());

  test('reads the whole bank over MIDI at the pedal’s pace and finds a slot renamed on it', async () => {
    // The pedal's real timing — a gap after every message, a delay before every reply —
    // on a clock the test winds forward, so 297 slots take no real time.
    vi.useFakeTimers();
    const device = new FakeGr55();
    device.replyDelayMs = 3;
    const session = new MidiSession(device, device, RolandGR55SysExConfig, 0x10, {
      timeoutMs: 200,
    });
    const editor = new Gr55Editor(session);
    const cache = new MemorySyncCache();
    device.nameUserPatch(5, 'Clean Verse');
    // One request goes unanswered early on: the engine must back off and carry on.
    device.dropRequests = 1;

    const engine = new SyncEngine(editor, cache);
    let etaSeen = false;
    engine.subscribe(() => {
      etaSeen ||= engine.snapshot().etaMs !== undefined;
    });
    const startedAt = Date.now();
    const first = engine.start();
    await vi.runAllTimersAsync();
    await first;
    expect(engine.snapshot()).toMatchObject({ phase: 'ready', done: USER_PATCH_COUNT });
    expect(engine.slot(5)?.name).toBe('Clean Verse');
    expect(etaSeen).toBe(true);
    // Paced, not flooded: every request waited its turn behind the session's gap.
    const requests = USER_PATCH_COUNT * PATCH_BLOCKS.length;
    expect(Date.now() - startedAt).toBeGreaterThan(requests * 20);
    // The clean run after the one timeout earned the speed back.
    expect(engine.paceMs).toBe(0);

    device.nameUserPatch(5, 'Loud Chorus');
    const requestsBefore = device.received.length;
    const later = new SyncEngine(editor, cache);
    const second = later.start();
    await vi.runAllTimersAsync();
    await second;
    expect(later.snapshot().phase).toBe('changed');
    expect(later.snapshot().changed).toEqual([
      { userPatchNumber: 5, before: 'Clean Verse', after: 'Loud Chorus', parameters: 1 },
    ]);
    // One probe per slot, the system page, and the blocks of the one slot that changed.
    expect(device.received.length - requestsBefore).toBe(
      USER_PATCH_COUNT + 1 + PATCH_BLOCKS.length,
    );
    session.close();
  });
});
