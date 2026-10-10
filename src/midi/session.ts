import { MultiQueueScheduler } from '../protocol/MultiQueueScheduler';
import {
  BROADCAST_IDENTITY_REQUEST_MESSAGE,
  BULK_DATA_TRANSFER_SIZE_PER_MESSAGE,
  GAP_BETWEEN_MESSAGES_MS,
  isValidChecksum,
  makeDataRequestMessage,
  makeDataSetMessage,
  makeRawDataRequestMessage,
  parseDataResponseMessage,
  parseIdentityReplyMessage,
} from '../protocol/RolandSysExProtocol';
import type { DeviceIdentity, RolandSysExConfig } from '../protocol/RolandSysExProtocol';

// The subset of Web MIDI ports the session needs, so tests can stand in for a pedal.
export interface MidiMessageLike {
  readonly data: Uint8Array | null;
}
export type MidiMessageListener = (event: MidiMessageLike) => void;
export interface MidiInputLike {
  addEventListener(type: 'midimessage', listener: MidiMessageListener): void;
  removeEventListener(type: 'midimessage', listener: MidiMessageListener): void;
}
export interface MidiOutputLike {
  send(data: number[] | Uint8Array): void;
}

export interface MidiSessionOptions {
  gapMs?: number;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 5000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MidiTimeoutError extends Error {
  constructor(what: string) {
    super(`${what} timed out`);
    this.name = 'MidiTimeoutError';
  }
}

/**
 * Sends a universal Identity Request and resolves with the first reply.
 * The caller decides whether the device that answered is the one it wants.
 */
export function identify(
  input: MidiInputLike,
  output: MidiOutputLike,
  timeoutMs = 1500,
): Promise<DeviceIdentity> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      input.removeEventListener('midimessage', listener);
    };
    const listener: MidiMessageListener = ({ data }) => {
      const identity = data && parseIdentityReplyMessage(data);
      if (identity) {
        cleanup();
        resolve(identity);
      }
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new MidiTimeoutError('Identity request'));
    }, timeoutMs);
    input.addEventListener('midimessage', listener);
    try {
      output.send(BROADCAST_IDENTITY_REQUEST_MESSAGE);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}

type PendingResponse = {
  address: number;
  // null: a command reply of unknown length, matched by exact address
  length: number | null;
  buffer: Uint8Array;
  received: number;
  resolve: (value: Uint8Array) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

type Expectation = { pending: PendingResponse; promise: Promise<Uint8Array> };

type QueuedWrite = { bytes: Uint8Array; done: Promise<void> };

type QueueId = 'write' | 'read';

/**
 * RQ1/DT1 traffic with one Roland device over a pair of MIDI ports.
 * Messages go out one at a time, writes before reads, with a pause after each.
 */
export class MidiSession {
  private readonly scheduler = new MultiQueueScheduler<QueueId>(['write', 'read']);
  private readonly pending = new Set<PendingResponse>();
  private readonly queuedWrites = new Map<number, QueuedWrite>();
  private readonly dataListeners = new Set<(address: number, bytes: Uint8Array) => void>();
  private readonly channelListeners = new Set<(data: Uint8Array) => void>();
  private readonly gapMs: number;
  private readonly timeoutMs: number;
  private closed = false;

  constructor(
    private readonly input: MidiInputLike,
    private readonly output: MidiOutputLike,
    readonly config: RolandSysExConfig,
    readonly deviceId: number,
    options: MidiSessionOptions = {},
  ) {
    this.gapMs = options.gapMs ?? GAP_BETWEEN_MESSAGES_MS;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.input.addEventListener('midimessage', this.handleMessage);
  }

  /** DT1 messages from the device that no pending request was waiting for. */
  onData(listener: (address: number, bytes: Uint8Array) => void): () => void {
    this.dataListeners.add(listener);
    return () => this.dataListeners.delete(listener);
  }

  /** Channel messages (program change, control change) from the device. */
  onChannelMessage(listener: (data: Uint8Array) => void): () => void {
    this.channelListeners.add(listener);
    return () => this.channelListeners.delete(listener);
  }

  /** RQ1: reads `length` bytes starting at a packed 7-bit address. */
  requestData(address: number, length: number): Promise<Uint8Array> {
    return this.scheduler.enqueue(async () => {
      this.assertOpen();
      const response = this.expectResponse(address, length, 'Data request');
      this.sendExpecting(makeDataRequestMessage(this.config, this.deviceId, address, length), [
        response,
      ]);
      const bytes = await response.promise;
      await delay(this.gapMs);
      return bytes;
    }, 'read');
  }

  /**
   * DT1: writes bytes at a packed 7-bit address, sliced into messages the device accepts.
   * With `coalesce`, a write still waiting in the queue for the same address is replaced
   * by this one, so dragging a slider does not flood the pedal with stale values.
   */
  writeData(
    address: number,
    bytes: Uint8Array | readonly number[],
    { coalesce = false }: { coalesce?: boolean } = {},
  ): Promise<void> {
    const copy = Uint8Array.from(bytes);
    if (coalesce) {
      const queued = this.queuedWrites.get(address);
      if (queued && queued.bytes.length === copy.length) {
        queued.bytes = copy;
        return queued.done;
      }
    }
    const entry: QueuedWrite = { bytes: copy, done: Promise.resolve() };
    entry.done = this.scheduler.enqueue(async () => {
      if (this.queuedWrites.get(address) === entry) {
        this.queuedWrites.delete(address);
      }
      this.assertOpen();
      const size = BULK_DATA_TRANSFER_SIZE_PER_MESSAGE;
      for (let offset = 0; offset < entry.bytes.length; offset += size) {
        this.output.send(
          makeDataSetMessage(
            this.config,
            this.deviceId,
            address + offset,
            entry.bytes.subarray(offset, offset + size),
          ),
        );
        await delay(this.gapMs);
      }
    }, 'write');
    if (coalesce) {
      this.queuedWrites.set(address, entry);
    }
    return entry.done;
  }

  /**
   * The RQ1 variant some Roland devices use as a command: no length field, an action on
   * the device, and replies at addresses other than the one requested. The queue stays
   * blocked until every expected reply has arrived.
   */
  command(
    address: number,
    args: Uint8Array | readonly number[],
    responseAddresses: readonly number[],
  ): Promise<Map<number, Uint8Array>> {
    return this.scheduler.enqueue(async () => {
      this.assertOpen();
      const responses = responseAddresses.map((responseAddress) =>
        this.expectResponse(responseAddress, null, 'Command'),
      );
      this.sendExpecting(
        makeRawDataRequestMessage(this.config, this.deviceId, address, args),
        responses,
      );
      const values = await Promise.all(responses.map((response) => response.promise));
      await delay(this.gapMs);
      return new Map(responseAddresses.map((responseAddress, i) => [responseAddress, values[i]]));
    }, 'write');
  }

  close(): void {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.input.removeEventListener('midimessage', this.handleMessage);
    for (const pending of [...this.pending]) {
      this.settle(pending);
      pending.reject(new Error('MIDI session closed'));
    }
    this.dataListeners.clear();
    this.channelListeners.clear();
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new Error('MIDI session closed');
    }
  }

  private expectResponse(address: number, length: number | null, what: string): Expectation {
    let pending!: PendingResponse;
    const promise = new Promise<Uint8Array>((resolve, reject) => {
      pending = {
        address,
        length,
        buffer: new Uint8Array(length ?? 0),
        received: 0,
        resolve,
        reject,
        timer: setTimeout(() => {
          this.pending.delete(pending);
          reject(new MidiTimeoutError(what));
        }, this.timeoutMs),
      };
    });
    this.pending.add(pending);
    return { pending, promise };
  }

  private sendExpecting(message: number[], responses: Expectation[]): void {
    try {
      this.output.send(message);
    } catch (error) {
      for (const { pending } of responses) {
        this.settle(pending);
        pending.reject(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  private settle(pending: PendingResponse): void {
    clearTimeout(pending.timer);
    this.pending.delete(pending);
  }

  private readonly handleMessage: MidiMessageListener = ({ data }) => {
    if (!data || data.length === 0) {
      return;
    }
    if (data[0] !== 0xf0) {
      for (const listener of this.channelListeners) {
        listener(data);
      }
      return;
    }
    const parsed = parseDataResponseMessage(this.config, data);
    if (!parsed || parsed.deviceId !== this.deviceId || !isValidChecksum(parsed)) {
      return;
    }
    const { address, valueBytes } = parsed;
    let consumed = false;
    for (const pending of [...this.pending]) {
      if (pending.length == null) {
        if (address === pending.address) {
          consumed = true;
          this.settle(pending);
          pending.resolve(valueBytes);
        }
        continue;
      }
      // A device may answer one request with several DT1 messages; collect until complete.
      const offset = address - pending.address;
      if (offset >= 0 && offset + valueBytes.length <= pending.length) {
        consumed = true;
        pending.buffer.set(valueBytes, offset);
        pending.received += valueBytes.length;
        if (pending.received >= pending.length) {
          this.settle(pending);
          pending.resolve(pending.buffer);
        }
      }
    }
    if (!consumed) {
      for (const listener of this.dataListeners) {
        listener(address, valueBytes);
      }
    }
  };
}
