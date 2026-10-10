import { MidiSession } from '../../midi/session';
import { fetchAndTokenize } from '../../protocol/RolandAddressMap';
import type { EnumField, FieldReference } from '../../protocol/RolandAddressMap';
import { RolandGR55SysExConfig } from '../../protocol/RolandDevices';
import { pack7, rolandChecksum } from '../../protocol/RolandSysExProtocol';
import { Gr55Editor } from './editor';
import { FakeGr55 } from './fakeDevice';
import { formatRate113, formatTime3413, formatToneRate150 } from '../../protocol/tempoLabels';
import { shownTextValue } from './FieldControl';
import { buildPages, effectOfFields, isField, memberOf } from './pages';
import type { Page, StructReference } from './pages';
import {
  GR55_MAP,
  PATCH_BLOCKS,
  PATCH_SPAN,
  TEMPORARY_PATCH,
  TEMPORARY_PATCH_ADDRESS,
  userPatchAddress,
} from './patchLayout';
import {
  SyxError,
  decodePatchSyx,
  decodeSlotBackupSyx,
  encodePatchSyx,
  encodeSlotBackupSyx,
} from './syx';
import type { SlotImage } from './syx';
import { spansOverlapping, temporaryPatchFields } from './changeTracking';

const common = TEMPORARY_PATCH.common;
// A plain one-byte parameter, at 18 00 06 10.
const reverbLevel = TEMPORARY_PATCH.sendsAndEq.reverbEffectLevel;

function setUp() {
  const device = new FakeGr55();
  const session = new MidiSession(device, device, RolandGR55SysExConfig, 0x10, {
    gapMs: 0,
    timeoutMs: 500,
  });
  return { device, session, editor: new Gr55Editor(session) };
}

function settle(ms = 20) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('patch layout', () => {
  test('the temporary patch sits at 18 00 00 00 and spans 00 00 31 28', () => {
    expect(TEMPORARY_PATCH_ADDRESS).toBe(pack7(0x18000000));
    expect(PATCH_SPAN).toBe(pack7(0x3128));
  });

  test('blocks match the reads the protocol itself would make', async () => {
    const reads: { offset: number; length: number }[] = [];
    await fetchAndTokenize(TEMPORARY_PATCH.definition, 0, async (offset, length) => {
      reads.push({ offset, length });
      return new Uint8Array(length);
    });
    const byOffset = (a: { offset: number }, b: { offset: number }) => a.offset - b.offset;
    expect([...PATCH_BLOCKS].sort(byOffset)).toEqual(reads.sort(byOffset));
  });

  test('user patch slots start at 20 00 00 00, one every 00 01 00 00', () => {
    expect(userPatchAddress(0)).toBe(pack7(0x20000000));
    expect(userPatchAddress(1)).toBe(pack7(0x20010000));
    expect(userPatchAddress(128)).toBe(pack7(0x21000000));
  });
});

describe('Gr55Editor', () => {
  test('reads the temporary patch block by block', async () => {
    const { device, editor } = setUp();
    device.poke(reverbLevel.address, [77]);
    const progress: number[] = [];

    await editor.readPatch((done) => progress.push(done));

    expect(editor.patchName).toBe('Simulated Patch');
    expect(editor.read(reverbLevel)).toEqual({ ok: true, value: 77 });
    expect(progress).toHaveLength(PATCH_BLOCKS.length);
    expect(device.received.every((message) => message[6] === 0x11)).toBe(true);
  });

  test('an edit sends one short DT1 for that field only', async () => {
    const { device, editor } = setUp();
    await editor.readPatch();
    device.received.length = 0;

    editor.write(reverbLevel, 90);
    await settle();

    expect(device.received).toHaveLength(1);
    // 14 bytes: header 7, address 4, one data byte, checksum, F7.
    expect(device.received[0]).toHaveLength(14);
    expect(editor.read(reverbLevel)).toEqual({ ok: true, value: 90 });
    expect([...device.peek(reverbLevel.address, 1)]).toEqual([90]);
  });

  test('a patch name keeps a space while it is being typed', async () => {
    const { device, editor } = setUp();
    await editor.readPatch();
    let draft: string | null = null;
    const type = (next: string) => {
      draft = next;
      editor.write(common.patchName, next);
    };
    const shown = () => {
      const read = editor.read(common.patchName);
      return shownTextValue(read.ok ? read.value : '', draft);
    };

    type('Foo');
    type('Foo ');
    expect(shown()).toBe('Foo ');
    type('Foo Bar');
    expect(shown()).toBe('Foo Bar');
    expect(editor.patchName).toBe('Foo Bar');

    draft = null;
    expect(shown()).toBe('Foo Bar');
    await settle();
    const nameOffset = common.patchName.address - TEMPORARY_PATCH_ADDRESS;
    expect(device.peek(TEMPORARY_PATCH_ADDRESS + nameOffset, 7)).toEqual(
      Uint8Array.from('Foo Bar', (char) => char.charCodeAt(0)),
    );
  });

  test('editing never writes outside the temporary patch', async () => {
    const { device, editor } = setUp();
    await editor.readPatch();
    device.received.length = 0;

    editor.write(common.patchName, 'New Name');
    editor.write(TEMPORARY_PATCH.sendsAndEq.reverbSwitch, true);
    await settle();

    const writes = device.received.filter((message) => message[6] === 0x12);
    expect(writes).toHaveLength(2);
    expect(writes.every((message) => message[7] === 0x18)).toBe(true);
  });

  test('a field changes its snapshot when edited, and only that field', async () => {
    const { editor } = setUp();
    await editor.readPatch();
    const level = editor.fieldSnapshot(reverbLevel.address);
    const tempo = editor.fieldSnapshot(common.patchTempo.address);

    editor.write(reverbLevel, 3);

    expect(editor.fieldSnapshot(reverbLevel.address)).not.toBe(level);
    expect(editor.fieldSnapshot(common.patchTempo.address)).toBe(tempo);
  });

  test('a byte the map has no label for is reported raw instead of throwing', async () => {
    const { device, editor } = setUp();
    const field = TEMPORARY_PATCH.sendsAndEq.reverbType;
    device.poke(field.address, [0x7f]);
    await editor.readPatch();

    expect(editor.read(field)).toEqual({ ok: false, raw: Uint8Array.of(0x7f) });
  });

  test('a parameter changed on the pedal updates the mirror', async () => {
    const { device, editor } = setUp();
    await editor.readPatch();

    const body = [0x18, 0x00, 0x06, 0x10, 55];
    const header = [0xf0, 0x41, 0x10, 0x00, 0x00, 0x53, 0x12];
    // A message with a wrong checksum is ignored; the valid one lands.
    device.emit([...header, 0x18, 0x00, 0x06, 0x10, 66, 0x00, 0xf7]);
    expect(editor.read(reverbLevel)).toEqual({ ok: true, value: 0 });
    device.emit([...header, ...body, rolandChecksum(body), 0xf7]);

    expect(reverbLevel.address).toBe(pack7(0x18000610));
    expect(editor.read(reverbLevel)).toEqual({ ok: true, value: 55 });
  });

  test('a program change from the pedal triggers a fresh read', async () => {
    const { device, editor } = setUp();
    await editor.readPatch();
    device.poke(reverbLevel.address, [9]);

    const before = editor.patchSnapshot();
    device.emit([0xc0, 3]);
    await vi.waitFor(() => expect(editor.patchSnapshot()).not.toBe(before), { timeout: 3000 });

    expect(editor.read(reverbLevel)).toEqual({ ok: true, value: 9 });
  });

  test('reloading the system mode picks up a change on the pedal', async () => {
    const { device, editor } = setUp();
    const modes: string[] = [];
    editor.subscribe(() => modes.push(editor.gkMode));

    await editor.readSystem();
    expect(editor.gkMode).toBe('GUITAR');

    device.poke(GR55_MAP.system.common.guitarBassSelect.address, [1]);
    await editor.readSystem();

    expect(editor.gkMode).toBe('BASS');
    expect(modes).toContain('BASS');
  });

  test('writing to a user slot sends the write command and nothing else', async () => {
    const { device, editor } = setUp();
    await editor.readPatch();
    editor.write(common.patchName, 'Keeper');
    await settle();
    device.received.length = 0;

    await editor.writeToUserSlot(130);

    expect(device.received).toHaveLength(1);
    // Slot 130 is bank MSB 1, program 2.
    expect(device.received[0].slice(6, 15)).toEqual([0x11, 0x0f, 0, 0, 0, 1, 0, 2, 0x7f]);
    expect(await editor.readUserPatchName(130)).toBe('Keeper');
  });

  test('selecting a patch writes the setup page and reads the patch back', async () => {
    const { device, editor } = setUp();
    await editor.readPatch();
    editor.write(common.patchName, 'Stored');
    await settle();
    await editor.writeToUserSlot(4);
    editor.write(common.patchName, 'Scratch');
    await settle();
    device.received.length = 0;

    await editor.selectPatch(0, 4);

    expect(device.received.slice(0, 2).map((message) => message.slice(6, 12))).toEqual([
      [0x12, 0x01, 0, 0, 0, 0],
      [0x12, 0x01, 0, 0, 1, 4],
    ]);
    expect(editor.patchName).toBe('Stored');
  });
});

describe('unsaved changes', () => {
  test('field spans form a deduplicated, ordered, non-overlapping index', () => {
    const fields = temporaryPatchFields();
    expect(fields.length).toBeGreaterThan(600);
    for (let index = 1; index < fields.length; index++) {
      const previous = fields[index - 1];
      expect(fields[index].offset).toBeGreaterThanOrEqual(previous.offset + previous.size);
    }
  });

  test('spansOverlapping finds the range that touches', () => {
    const fields = temporaryPatchFields();
    const target = TEMPORARY_PATCH.sendsAndEq.reverbEffectLevel;
    const offset = target.address - TEMPORARY_PATCH_ADDRESS;
    const hits = spansOverlapping(fields, offset, 1);
    expect(hits).toHaveLength(1);
    expect(hits[0].address).toBe(target.address);
  });

  test('an edit counts, writing the loaded value back uncounts', async () => {
    const { editor } = setUp();
    await editor.readPatch();
    expect(editor.isDirty).toBe(false);

    editor.write(reverbLevel, 90);
    expect(editor.changeCount).toBe(1);

    editor.write(reverbLevel, 0);
    expect(editor.isDirty).toBe(false);
  });

  test('a second field added to the count', async () => {
    const { editor } = setUp();
    await editor.readPatch();

    editor.write(reverbLevel, 90);
    editor.write(common.patchName, 'Scratch');
    expect(editor.changeCount).toBe(2);
  });

  test('a remote pedal change lands in the count', async () => {
    const { device, editor } = setUp();
    await editor.readPatch();

    const body = [0x18, 0x00, 0x06, 0x10, 55];
    device.emit([0xf0, 0x41, 0x10, 0x00, 0x00, 0x53, 0x12, ...body, rolandChecksum(body), 0xf7]);

    expect(editor.read(reverbLevel)).toEqual({ ok: true, value: 55 });
    expect(editor.changeCount).toBe(1);
  });

  test('revert sends the loaded bytes back to the pedal and empties the count', async () => {
    const { device, editor } = setUp();
    await editor.readPatch();
    editor.write(common.patchName, 'Scratch');
    editor.write(reverbLevel, 90);
    await settle();
    device.received.length = 0;

    await editor.revert();

    expect(editor.isDirty).toBe(false);
    expect(editor.patchName).toBe('Simulated Patch');
    const writes = device.received.filter((message) => message[6] === 0x12);
    expect(writes.length).toBeGreaterThanOrEqual(2);
  });

  test('a program change from the pedal discards unsaved edits and records how many', async () => {
    const { device, editor } = setUp();
    await editor.readPatch();
    editor.write(reverbLevel, 90);

    const before = editor.patchSnapshot();
    device.emit([0xc0, 3]);
    await vi.waitFor(() => expect(editor.patchSnapshot()).not.toBe(before), { timeout: 3000 });

    expect(editor.isDirty).toBe(false);
    expect(editor.discardedChanges).toBe(1);
  });
});

describe('slot backup files', () => {
  test('slot images survive the trip through a file and back into the pedal', async () => {
    const { editor } = setUp();
    await editor.readPatch();
    await editor.writeToUserSlot(4);
    await editor.writeToUserSlot(5);

    const images: SlotImage[] = [
      { userPatchNumber: 4, bytes: await editor.readUserPatch(4) },
      { userPatchNumber: 5, bytes: await editor.readUserPatch(5) },
    ];
    const file = encodeSlotBackupSyx(images);
    const loaded = decodeSlotBackupSyx(file);
    expect(loaded.map((slot) => slot.userPatchNumber)).toEqual([4, 5]);
    expect(loaded[0].bytes).toEqual(images[0].bytes);

    // Put the first slot image back into another slot and read it out again.
    await editor.restoreUserPatch(6, loaded[0].bytes);
    expect(await editor.readUserPatch(6)).toEqual(images[0].bytes);
  });

  test('slot files refuse damage and refuse non-slot data', () => {
    const file = encodeSlotBackupSyx([]);
    try {
      decodeSlotBackupSyx(file);
    } catch (error) {
      expect(error instanceof SyxError ? error.problem : 'no error').toBe('no-patch-data');
    }
  });
});

describe('slot diff', () => {
  test('a slot just written matches the working copy, then the diff follows the edits', async () => {
    const { editor } = setUp();
    await editor.readPatch();
    await editor.writeToUserSlot(4);

    expect(await editor.diffUserSlot(4)).toEqual([]);

    editor.write(common.patchName, 'Scratch');
    const diff = await editor.diffUserSlot(4);
    expect(diff.some((entry) => entry.current.startsWith('Scratch'))).toBe(true);
    expect(diff.every((entry) => entry.description && entry.current && entry.slot !== '')).toBe(
      true,
    );
  });
});

describe('.syx files', () => {
  test('a patch survives the trip through a file', async () => {
    const { device, editor } = setUp();
    device.poke(
      TEMPORARY_PATCH_ADDRESS,
      Uint8Array.from({ length: PATCH_SPAN }, (_, i) => i % 100),
    );
    await editor.readPatch();
    const file = editor.exportSyx();

    const other = setUp();
    await other.editor.importSyx(file);

    for (const block of PATCH_BLOCKS) {
      const address = TEMPORARY_PATCH_ADDRESS + block.offset;
      expect(other.device.peek(address, block.length)).toEqual(device.peek(address, block.length));
    }
    expect(other.editor.read(reverbLevel)).toEqual(editor.read(reverbLevel));
  });

  test('the file is plain DT1 messages for the temporary patch, 256 data bytes at most', () => {
    const file = encodePatchSyx(new Uint8Array(PATCH_SPAN));
    const messages = String.fromCharCode(...file)
      .split('\xf7')
      .slice(0, -1);
    expect(messages.length).toBeGreaterThanOrEqual(PATCH_BLOCKS.length);
    for (const message of messages) {
      const bytes = [...message].map((char) => char.charCodeAt(0));
      expect(bytes.slice(0, 8)).toEqual([0xf0, 0x41, 0x10, 0x00, 0x00, 0x53, 0x12, 0x18]);
      expect(bytes.length - 12).toBeLessThanOrEqual(256);
    }
    const dataBytes = decodePatchSyx(file).reduce((sum, write) => sum + write.bytes.length, 0);
    expect(dataBytes).toBe(PATCH_BLOCKS.reduce((sum, block) => sum + block.length, 0));
  });

  test('loading a file writes only to the temporary patch', async () => {
    const { device, editor } = setUp();
    const file = encodePatchSyx(new Uint8Array(PATCH_SPAN));
    await editor.importSyx(file);
    const writes = device.received.filter((message) => message[6] === 0x12);
    expect(writes.length).toBeGreaterThan(0);
    expect(writes.every((message) => message[7] === 0x18)).toBe(true);
  });

  test('a dump of a user slot is rebased onto the patch', () => {
    const body = [0x20, 0x05, 0x02, 0x30, 99];
    const sum = (128 - (body.reduce((a, b) => a + b, 0) % 128)) & 0x7f;
    const file = Uint8Array.from([0xf0, 0x41, 0x10, 0x00, 0x00, 0x53, 0x12, ...body, sum, 0xf7]);
    expect(decodePatchSyx(file)).toEqual([{ offset: pack7(0x0230), bytes: Uint8Array.of(99) }]);
  });

  test('files without patch data or with a bad checksum are refused', () => {
    const problem = (file: number[]) => {
      try {
        decodePatchSyx(Uint8Array.from(file));
      } catch (error) {
        return error instanceof SyxError ? error.problem : error;
      }
      return 'accepted';
    };
    expect(problem([])).toBe('no-patch-data');
    expect(problem([0xf0, 0x7e, 0x7f, 0x06, 0x01, 0xf7])).toBe('no-patch-data');
    expect(
      problem([0xf0, 0x41, 0x10, 0x00, 0x00, 0x53, 0x12, 0x18, 0x00, 0x02, 0x30, 55, 0x00, 0xf7]),
    ).toBe('bad-checksum');
  });
});

describe('pages', () => {
  function fieldsOf(pages: Page[]): number[] {
    return pages.flatMap((page) =>
      page.sections.flatMap((section) =>
        section.keys.map((key) => memberOf(section.struct, key).address),
      ),
    );
  }

  function allFields(struct: StructReference, out: number[] = []): number[] {
    for (const key of Object.keys(struct.definition.$)) {
      const member = memberOf(struct, key);
      if (isField(member)) {
        if (!member.definition.description.includes('Reserved')) {
          out.push(member.address);
        }
      } else {
        allFields(member as StructReference, out);
      }
    }
    return out;
  }

  test('every parameter of the patch is on exactly one page', () => {
    const guitar = fieldsOf(buildPages('GUITAR'));
    const bass = fieldsOf(buildPages('BASS'));
    expect(new Set(guitar).size).toBe(guitar.length);
    expect(new Set(bass).size).toBe(bass.length);

    const everything = allFields(TEMPORARY_PATCH as unknown as StructReference);
    const shown = new Set([...guitar, ...bass]);
    expect(everything.filter((address) => !shown.has(address))).toEqual([]);
    expect(shown.size).toBe(everything.length);
  });

  test('each GK mode hides the modeling parameters of the other', () => {
    const keys = (mode: 'GUITAR' | 'BASS') =>
      buildPages(mode).find((page) => page.id === 'modeling')!.sections[0].keys;
    expect(keys('GUITAR').some((key) => key.endsWith('_bass'))).toBe(false);
    expect(keys('BASS').some((key) => key.endsWith('_guitar'))).toBe(false);
    expect(keys('GUITAR')).toContain('level');
  });

  test('rate and time show note names only above the numeric range', () => {
    const delayTime = TEMPORARY_PATCH.sendsAndEq.delayTime.definition.type;
    const chorusRate = TEMPORARY_PATCH.sendsAndEq.chorusRate.definition.type;
    expect(chorusRate.format(100)).toBe('100');
    expect(formatRate113(101)).toBe('WHL');
    expect(chorusRate.format(113)).toBe('16TH');
    expect(formatTime3413(3400)).toBe('3400 ms');
    expect(delayTime.format(3401)).toBe('16TH');
    expect(delayTime.format(3413)).toBe('WHL');
    expect(formatToneRate150(127)).toBe('127');
    expect(formatToneRate150(128)).toBe('2WHL');
    expect(formatToneRate150(149)).toBe('64TH3');
    expect(formatToneRate150(150)).toBe('TONE');
    // A note value still encodes as that same number.
    const bytes = new Uint8Array(delayTime.size);
    delayTime.encode(3401, bytes, 0, delayTime.size);
    expect(delayTime.decode(bytes, 0, delayTime.size)).toBe(3401);
  });

  test.each([
    [
      'mod',
      [
        'modChorusSendLevel',
        'modDelaySendLevel',
        'modReverbSendLevel',
        'modSwitch',
        'modType',
        'modPan',
      ],
    ],
    [
      'mfx',
      [
        'mfxChorusSendLevel',
        'mfxDelaySendLevel',
        'mfxReverbSendLevel',
        'mfxSwitch',
        'mfxType',
        'mfxPan',
      ],
    ],
  ])('%s parameters are grouped under their effect type', (id, alwaysShown) => {
    const section = buildPages('GUITAR').find((page) => page.id === id)!.sections[0];
    const effects = effectOfFields(section);

    expect(section.keys.filter((key) => effects.get(key) == null)).toEqual(alwaysShown);

    const type = memberOf(section.struct, section.typeKey!) as FieldReference<EnumField>;
    const labels = Object.values(type.definition.type.labels);
    expect([...new Set(effects.values())].filter(Boolean).sort()).toEqual([...labels].sort());
  });
});
