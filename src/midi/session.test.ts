import { FakeGr55 } from '../devices/gr55/fakeDevice';
import { RolandGR55SysExConfig } from '../protocol/RolandDevices';
import { pack7, rolandChecksum } from '../protocol/RolandSysExProtocol';
import { MidiSession, MidiTimeoutError, identify } from './session';

const TEMPORARY_PATCH = pack7(0x18000000);

function connect(device: FakeGr55, options = { gapMs: 0, timeoutMs: 200 }) {
  return new MidiSession(device, device, RolandGR55SysExConfig, 0x10, options);
}

describe('identify', () => {
  test('sends the universal Identity Request and parses the reply', async () => {
    const device = new FakeGr55();
    const identity = await identify(device, device);
    expect(device.received[0]).toEqual([0xf0, 0x7e, 0x7f, 0x06, 0x01, 0xf7]);
    expect(identity.manufacturerId).toBe(0x41);
    expect(identity.deviceFamily).toBe(RolandGR55SysExConfig.familyCode);
    expect(identity.deviceId).toBe(0x10);
  });

  test('rejects when nothing answers', async () => {
    const device = new FakeGr55();
    device.answers = false;
    await expect(identify(device, device, 20)).rejects.toBeInstanceOf(MidiTimeoutError);
  });
});

describe('MidiSession', () => {
  test('requestData sends RQ1 with address, size and checksum', async () => {
    const device = new FakeGr55();
    device.poke(TEMPORARY_PATCH + 1, [0x41, 0x42, 0x43]);
    const session = connect(device);

    const bytes = await session.requestData(TEMPORARY_PATCH + 1, 3);

    expect([...bytes]).toEqual([0x41, 0x42, 0x43]);
    const body = [0x18, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03];
    expect(device.received[0]).toEqual([
      0xf0,
      0x41,
      0x10,
      0x00,
      0x00,
      0x53,
      0x11,
      ...body,
      rolandChecksum(body),
      0xf7,
    ]);
  });

  test('requestData collects an answer split over several DT1 messages', async () => {
    const device = new FakeGr55();
    const stored = Uint8Array.from({ length: 300 }, (_, i) => i % 128);
    device.poke(TEMPORARY_PATCH, stored);
    device.replyChunkSize = 128;
    const session = connect(device);

    expect(await session.requestData(TEMPORARY_PATCH, 300)).toEqual(stored);
  });

  test('requestData rejects after the timeout', async () => {
    const device = new FakeGr55();
    device.answers = false;
    const session = connect(device, { gapMs: 0, timeoutMs: 20 });
    await expect(session.requestData(TEMPORARY_PATCH, 1)).rejects.toBeInstanceOf(MidiTimeoutError);
  });

  test('writeData sends DT1 and the device stores it', async () => {
    const device = new FakeGr55();
    const session = connect(device);

    await session.writeData(pack7(0x18000230), [100]);
    await session.requestData(TEMPORARY_PATCH, 1); // lets the device process the write

    expect(device.received[0]).toEqual([
      0xf0,
      0x41,
      0x10,
      0x00,
      0x00,
      0x53,
      0x12,
      0x18,
      0x00,
      0x02,
      0x30,
      100,
      rolandChecksum([0x18, 0x00, 0x02, 0x30, 100]),
      0xf7,
    ]);
    expect([...device.peek(pack7(0x18000230), 1)]).toEqual([100]);
  });

  test('writeData slices a long write into messages of at most 256 data bytes', async () => {
    const device = new FakeGr55();
    const session = connect(device);
    const bytes = Uint8Array.from({ length: 328 }, (_, i) => i % 128);

    await session.writeData(TEMPORARY_PATCH, bytes);
    await session.requestData(TEMPORARY_PATCH, 1);

    const writes = device.received.filter((message) => message[6] === 0x12);
    expect(writes.map((message) => message.length - 13)).toEqual([256, 72]);
    // The second message starts 256 addresses in: 18 00 02 00 in 7-bit bytes.
    expect(writes[1].slice(7, 11)).toEqual([0x18, 0x00, 0x02, 0x00]);
    expect(device.peek(TEMPORARY_PATCH, 328)).toEqual(bytes);
  });

  test('coalesced writes to one address keep only the newest queued value', async () => {
    const device = new FakeGr55();
    const session = connect(device);
    const address = pack7(0x18000230);

    await Promise.all(
      [1, 2, 3, 4, 5].map((value) => session.writeData(address, [value], { coalesce: true })),
    );

    const writes = device.received.filter((message) => message[6] === 0x12);
    expect(writes).toHaveLength(1);
    expect(writes[0][11]).toBe(5);
  });

  test('messages are spaced by the gap', async () => {
    const device = new FakeGr55();
    const session = connect(device, { gapMs: 20, timeoutMs: 200 });
    const stamps: number[] = [];
    const send = device.send.bind(device);
    device.send = (data) => {
      stamps.push(performance.now());
      send(data);
    };

    await Promise.all(
      [1, 2, 3].map((value) => session.writeData(TEMPORARY_PATCH + value, [value])),
    );

    expect(stamps).toHaveLength(3);
    // Timers may fire a little early; anything near 20 ms shows the pause is there.
    expect(stamps[1] - stamps[0]).toBeGreaterThanOrEqual(15);
    expect(stamps[2] - stamps[1]).toBeGreaterThanOrEqual(15);
  });

  test('queued writes go out before queued reads', async () => {
    const device = new FakeGr55();
    const session = connect(device);

    const reads = [
      session.requestData(TEMPORARY_PATCH, 1),
      session.requestData(TEMPORARY_PATCH, 1),
    ];
    const write = session.writeData(TEMPORARY_PATCH, [7]);
    await Promise.all([...reads, write]);

    expect(device.received.map((message) => message[6])).toEqual([0x12, 0x11, 0x11]);
  });

  test('command waits for the replies at the given addresses', async () => {
    const device = new FakeGr55();
    const session = connect(device);

    const replies = await session.command(
      pack7(0x0f000000),
      [0, 0, 5, 0x7f],
      [pack7(0x0f000001), pack7(0x0f000002)],
    );

    expect([...replies.keys()]).toEqual([pack7(0x0f000001), pack7(0x0f000002)]);
    const body = [0x0f, 0x00, 0x00, 0x00, 0, 0, 5, 0x7f];
    expect(device.received[0].slice(6)).toEqual([0x11, ...body, rolandChecksum(body), 0xf7]);
  });

  test('unrequested DT1 and channel messages reach their listeners', async () => {
    const device = new FakeGr55();
    const session = connect(device);
    const data: [number, number[]][] = [];
    const channel: number[][] = [];
    session.onData((address, bytes) => data.push([address, [...bytes]]));
    session.onChannelMessage((bytes) => channel.push([...bytes]));

    const body = [0x18, 0x00, 0x02, 0x30, 42];
    device.emit([0xf0, 0x41, 0x10, 0x00, 0x00, 0x53, 0x12, ...body, rolandChecksum(body), 0xf7]);
    device.emit([0xc0, 5]);
    // Wrong checksum: dropped.
    device.emit([0xf0, 0x41, 0x10, 0x00, 0x00, 0x53, 0x12, ...body, 0x00, 0xf7]);

    expect(data).toEqual([[pack7(0x18000230), [42]]]);
    expect(channel).toEqual([[0xc0, 5]]);
  });

  test('close rejects what is still waiting', async () => {
    const device = new FakeGr55();
    device.answers = false;
    const session = connect(device, { gapMs: 0, timeoutMs: 1000 });
    const pending = session.requestData(TEMPORARY_PATCH, 1);
    await new Promise((resolve) => setTimeout(resolve, 10));
    session.close();
    await expect(pending).rejects.toThrow('MIDI session closed');
  });
});
