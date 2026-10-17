import { describe, expect, test } from 'vitest';
import { MidiSession } from '../../midi/session';
import { RolandGR55SysExConfig } from '../../protocol/RolandDevices';
import { FakeGr55 } from './fakeDevice';
import { Gr55Editor } from './editor';
import { saveUserSlotVerified } from './saveUserSlot';
import { assertSameUserSlot } from './patchGuard';
import { GR55_MAP } from './patchLayout';

function setUp() {
  const device = new FakeGr55();
  const session = new MidiSession(device, device, RolandGR55SysExConfig, 0x10, {
    gapMs: 0,
    timeoutMs: 500,
  });
  const editor = new Gr55Editor(session, () => undefined, { patchChangeSettleMs: 0 });
  /** Stage the pedal as sitting on USER slot 4 (setup BS MSB 0 + PC 4). */
  const selectSlot4 = () => {
    device.poke(GR55_MAP.setup.patchBsMsb.address, [0]);
    device.poke(GR55_MAP.setup.patchPc.address, [4]);
    return Promise.all([editor.readPatchLocation(), editor.readPatch()]);
  };
  return { device, session, editor, selectSlot4 };
}

describe('saveUserSlotVerified', () => {
  test('WRITE + readback succeeds on matching USER slot', async () => {
    const { editor, device, selectSlot4 } = setUp();
    await selectSlot4();
    device.poke(
      GR55_MAP.temporaryPatch.common.patchName.address,
      [
        0x54, 0x65, 0x73, 0x74, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20,
        0x20,
      ],
    );
    await editor.readPatch();
    const result = await saveUserSlotVerified(editor, 4);
    expect(result).toEqual({ ok: true, userPatchNumber: 4 });
  });

  test('detects content mismatch after corrupted WRITE', async () => {
    const { editor, device, selectSlot4 } = setUp();
    await selectSlot4();
    device.corruptNextWrite = true;
    const result = await saveUserSlotVerified(editor, 4);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('verify-mismatch');
    }
  });

  test('patch guard blocks when the pedal moved to another slot', async () => {
    const { editor, device, selectSlot4 } = setUp();
    await selectSlot4();
    // Pedal now sits on a different USER slot.
    device.poke(GR55_MAP.setup.patchPc.address, [7]);
    const guard = await assertSameUserSlot(editor, 4);
    expect(guard).toMatchObject({ ok: false, reason: 'slot-changed', expected: 4, actual: 7 });
  });
});
