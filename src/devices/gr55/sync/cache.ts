import type { GkMode } from '../editor';

/** One user slot as it was last read from the pedal. */
export interface SlotRecord {
  mode: GkMode;
  userPatchNumber: number;
  name: string;
  /** The slot's bytes, indexed like the temporary patch. */
  bytes: Uint8Array;
  checksum: number;
  /** The sync run that last read or confirmed this record. */
  run: number;
  readAt: number;
  /** The app saved into this slot since the record was read: its bytes are not to be trusted. */
  stale?: boolean;
}

/** A slot the last sync found different from what the cache held. */
export interface ChangedSlot {
  userPatchNumber: number;
  before: string;
  after: string;
  /** How many parameters differ. */
  parameters: number;
}

/** Bookkeeping of the sync of one GK mode: where it is, what it found. */
export interface SyncMeta {
  mode: GkMode;
  run: number;
  complete: boolean;
  finishedAt?: number;
  changed: ChangedSlot[];
  /** The pause between slot reads the pedal last kept up with, in milliseconds. */
  paceMs?: number;
  system?: Uint8Array;
}

/** Where sync keeps what it read. Survives a page reload when the browser allows. */
export interface SyncCache {
  loadSlots(mode: GkMode): Promise<SlotRecord[]>;
  putSlot(record: SlotRecord): Promise<void>;
  loadMeta(mode: GkMode): Promise<SyncMeta | undefined>;
  putMeta(meta: SyncMeta): Promise<void>;
}

/** FNV-1a over the bytes: cheap, and enough to tell two reads of a slot apart. */
export function checksumOf(bytes: Uint8Array, start = 0, end = bytes.length): number {
  let hash = 0x811c9dc5;
  for (let index = start; index < end; index++) {
    hash ^= bytes[index];
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** A cache that lives as long as the page. Used by tests and where IndexedDB is missing. */
export class MemorySyncCache implements SyncCache {
  private readonly slots = new Map<string, SlotRecord>();
  private readonly meta = new Map<GkMode, SyncMeta>();

  async loadSlots(mode: GkMode): Promise<SlotRecord[]> {
    return [...this.slots.values()]
      .filter((record) => record.mode === mode)
      .map((record) => ({ ...record, bytes: record.bytes.slice() }));
  }

  async putSlot(record: SlotRecord): Promise<void> {
    this.slots.set(`${record.mode}:${record.userPatchNumber}`, {
      ...record,
      bytes: record.bytes.slice(),
    });
  }

  async loadMeta(mode: GkMode): Promise<SyncMeta | undefined> {
    const meta = this.meta.get(mode);
    return meta && { ...meta, changed: [...meta.changed] };
  }

  async putMeta(meta: SyncMeta): Promise<void> {
    this.meta.set(meta.mode, { ...meta, changed: [...meta.changed] });
  }
}

const DATABASE = 'rigbench-gr55';
const SLOTS = 'slots';
const META = 'meta';

function settled<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** The cache in IndexedDB: one record per slot and mode, one meta record per mode. */
export class IndexedDbSyncCache implements SyncCache {
  private database: Promise<IDBDatabase> | undefined;

  private open(): Promise<IDBDatabase> {
    this.database ??= new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(SLOTS, { keyPath: ['mode', 'userPatchNumber'] });
        request.result.createObjectStore(META, { keyPath: 'mode' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return this.database;
  }

  private async store(name: string, access: IDBTransactionMode): Promise<IDBObjectStore> {
    return (await this.open()).transaction(name, access).objectStore(name);
  }

  async loadSlots(mode: GkMode): Promise<SlotRecord[]> {
    const range = IDBKeyRange.bound([mode, 0], [mode, Number.MAX_SAFE_INTEGER]);
    return settled((await this.store(SLOTS, 'readonly')).getAll(range) as IDBRequest<SlotRecord[]>);
  }

  async putSlot(record: SlotRecord): Promise<void> {
    await settled((await this.store(SLOTS, 'readwrite')).put(record));
  }

  async loadMeta(mode: GkMode): Promise<SyncMeta | undefined> {
    return settled(
      (await this.store(META, 'readonly')).get(mode) as IDBRequest<SyncMeta | undefined>,
    );
  }

  async putMeta(meta: SyncMeta): Promise<void> {
    await settled((await this.store(META, 'readwrite')).put(meta));
  }
}

export function openSyncCache(): SyncCache {
  return typeof indexedDB === 'undefined' ? new MemorySyncCache() : new IndexedDbSyncCache();
}
