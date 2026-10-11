import { describe, expect, test } from 'vitest';
import { MidiSession } from '../../midi/session';
import { RolandGR55SysExConfig } from '../../protocol/RolandDevices';
import { pack7 } from '../../protocol/RolandSysExProtocol';
import { FakeGr55 } from './fakeDevice';
import { GR55_MAP, PATCH_SPAN } from './patchLayout';
import {
  decodeSlotBackupSyx,
  decodeSystemBlocksSyx,
  encodePedalBackupSyx,
  encodeSystemBlocksSyx,
} from './syx';
import {
  GK_SET_COUNT,
  GK_SET_SPAN,
  GK_STRING_SENS,
  SYSTEM,
  SYSTEM_ADDRESS,
  SYSTEM_BLOCKS,
  SYSTEM_SPAN,
  gkSet,
} from './systemMap';
import { Gr55System } from './systemState';

// GK set 1 as a GR-55 answered it at 02 00 04 00 (guitar mode, factory state).
const GK_SET_1 = [
  0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x00, 0x0a, 0x02, 0x00, 0x00, 0x00, 0x14, 0x0a,
  0x0a, 0x02, 0x06, 0x09, 0x07, 0x0b, 0x0f, 0x46, 0x2b, 0x2b, 0x32, 0x28, 0x0a, 0x02, 0x05, 0x05,
  0x05, 0x05, 0x00,
];

function setUp() {
  const device = new FakeGr55();
  const session = new MidiSession(device, device, RolandGR55SysExConfig, 0x10, {
    gapMs: 0,
    timeoutMs: 500,
  });
  device.poke(gkSet(1).address, GK_SET_1);
  return { device, session, system: new Gr55System(session) };
}

describe('system map', () => {
  test('the areas sit where the pedal keeps them', () => {
    expect(SYSTEM_ADDRESS).toBe(pack7(0x02000000));
    expect(SYSTEM.common.guitarOutSource.address).toBe(pack7(0x02000016));
    expect(SYSTEM.pedals.ctlFunction.address).toBe(pack7(0x02000200));
    expect(SYSTEM.pedals.gkS2Function.address).toBe(pack7(0x0200026c));
    expect(gkSet(1).address).toBe(pack7(0x02000400));
    expect(gkSet(GK_SET_COUNT).address).toBe(pack7(0x02000d00));
    expect(gkSet(3).string6Sens.address).toBe(pack7(0x0200061c));
  });

  test('GUITAR/BASS is the same byte the patch map already knows', () => {
    expect(SYSTEM.common.guitarBassSelect.address).toBe(
      GR55_MAP.system.common.guitarBassSelect.address,
    );
  });

  test('the blocks read from the pedal cover every mapped field and nothing beyond', () => {
    expect(SYSTEM_BLOCKS).toHaveLength(2 + GK_SET_COUNT);
    const end = Math.max(...SYSTEM_BLOCKS.map((block) => block.offset + block.length));
    expect(end).toBe(SYSTEM_SPAN);
    const last = gkSet(GK_SET_COUNT).string6Sens;
    expect(last.address - SYSTEM_ADDRESS + last.definition.size).toBeLessThanOrEqual(SYSTEM_SPAN);
  });

  test('a GK set answered by a real pedal decodes to its settings', async () => {
    const { system } = setUp();
    await system.load();
    const set = gkSet(1);
    expect(system.read(set.name)).toEqual({ ok: true, value: '' });
    expect(system.read(set.puType)).toEqual({ ok: true, value: 'GK-3' });
    expect(system.read(set.puPhase)).toEqual({ ok: true, value: 'NORMAL' });
    expect(system.read(set.normalPuGain)).toEqual({ ok: true, value: 0 });
    expect(GK_STRING_SENS.map((key) => system.read(set[key]))).toEqual(
      [70, 43, 43, 50, 40, 10].map((value) => ({ ok: true, value })),
    );
    // Two nibbles, 0a 02: above the 160 that 660 mm takes, so one of the pedal's presets.
    expect(system.read(set.scale)).toEqual({ ok: true, value: 0xa2 });
  });
});

describe('Gr55System', () => {
  test('a change is staged and listed, and reaches the pedal only when applied', async () => {
    const { device, system } = setUp();
    await system.load();
    const field = SYSTEM.common.outputSelect;
    const sent = device.received.length;

    system.write(field, 'STACK');
    system.write(gkSet(2).string1Sens, 80);
    expect(system.read(field)).toEqual({ ok: true, value: 'STACK' });
    expect(system.readApplied(field)).toEqual({ ok: true, value: 'LINE/PHONES' });
    expect(device.received.length).toBe(sent);
    expect(system.changes.map(({ from, to, gkSet: set }) => ({ from, to, set }))).toEqual([
      { from: 'LINE/PHONES', to: 'STACK', set: undefined },
      { from: '0', to: '80', set: 2 },
    ]);

    await system.apply();
    expect(system.changeCount).toBe(0);
    expect([...device.peek(field.address, 1)]).toEqual([4]);
    expect([...device.peek(gkSet(2).string1Sens.address, 1)]).toEqual([80]);
    // One message per changed field, and nothing else.
    expect(device.received.length).toBe(sent + 2);
  });

  test('discarding drops what was staged', async () => {
    const { device, system } = setUp();
    await system.load();
    system.write(SYSTEM.common.rxSwitch, true);
    expect(system.changeCount).toBe(1);
    system.discard();
    expect(system.changeCount).toBe(0);
    expect([...device.peek(SYSTEM.common.rxSwitch.address, 1)]).toEqual([0]);
  });

  test('a change set back to what the pedal has is no change', async () => {
    const { system } = setUp();
    await system.load();
    system.write(gkSet(1).puType, 'PIEZO');
    system.write(gkSet(1).puType, 'GK-3');
    expect(system.changeCount).toBe(0);
  });

  test('scale is written as a plain length, never as a preset', async () => {
    const { device, system } = setUp();
    await system.load();
    system.write(gkSet(1).scale, 648 - 500);
    await system.apply();
    expect([...device.peek(gkSet(1).scale.address, 2)]).toEqual([0x09, 0x04]);
  });
});

describe('system backup files', () => {
  test('the mirrored system area round-trips through a .syx file and back onto a pedal', async () => {
    const { system } = setUp();
    await system.load();
    system.write(SYSTEM.common.outputSelect, 'COMBO');
    system.write(gkSet(7).name, 'GODIN');
    await system.apply();

    const file = encodeSystemBlocksSyx(SYSTEM_ADDRESS, system.appliedBytes(), SYSTEM_BLOCKS);
    const writes = decodeSystemBlocksSyx(file, SYSTEM_ADDRESS, SYSTEM_SPAN);
    expect(writes.map((write) => write.offset)).toEqual(SYSTEM_BLOCKS.map((b) => b.offset));

    const other = setUp();
    await other.system.load();
    await other.system.restore(writes);
    expect(other.system.read(SYSTEM.common.outputSelect)).toEqual({ ok: true, value: 'COMBO' });
    expect(other.system.read(gkSet(7).name)).toEqual({ ok: true, value: 'GODIN' });
    // The pedal's eight characters, padded with spaces.
    expect([...other.device.peek(gkSet(7).name.address, 8)]).toEqual([
      0x47, 0x4f, 0x44, 0x49, 0x4e, 0x20, 0x20, 0x20,
    ]);
    expect([...other.device.peek(gkSet(1).address, GK_SET_SPAN)]).toEqual(GK_SET_1);
  });

  test('a whole-pedal file holds the system and the slots, each readable on its own', async () => {
    const { system } = setUp();
    await system.load();
    const slot = new Uint8Array(PATCH_SPAN);
    slot[0] = 0x41;
    const file = encodePedalBackupSyx(
      encodeSystemBlocksSyx(SYSTEM_ADDRESS, system.appliedBytes(), SYSTEM_BLOCKS),
      [{ userPatchNumber: 12, bytes: slot }],
    );
    expect(decodeSystemBlocksSyx(file, SYSTEM_ADDRESS, SYSTEM_SPAN)).toHaveLength(
      SYSTEM_BLOCKS.length,
    );
    const slots = decodeSlotBackupSyx(file);
    expect(slots.map((image) => image.userPatchNumber)).toEqual([12]);
    expect(slots[0].bytes[0]).toBe(0x41);
  });
});
