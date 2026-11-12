import { describe, expect, test } from 'vitest';
import { MidiSession } from '../../../midi/session';
import { RolandGR55SysExConfig } from '../../../protocol/RolandDevices';
import { FakeGr55 } from '../fakeDevice';
import { Gr55Editor } from '../editor';
import { GR55_MAP, TEMPORARY_PATCH } from '../patchLayout';
import { Gr55System } from '../systemState';
import { createGr55Session } from './session';

const patch = TEMPORARY_PATCH;
const reverbLevel = patch.sendsAndEq.reverbEffectLevel;

function setUp() {
  const device = new FakeGr55();
  const session = new MidiSession(device, device, RolandGR55SysExConfig, 0x10, {
    gapMs: 0,
    timeoutMs: 400,
  });
  const editor = new Gr55Editor(session, undefined, { patchChangeSettleMs: 20 });
  const system = new Gr55System(session);
  return { device, editor, system, intentions: createGr55Session(editor, system) };
}

async function ready() {
  const rig = setUp();
  await rig.editor.readPatch();
  await rig.system.load();
  await rig.editor.readPatchLocation();
  rig.device.poke(reverbLevel.address, [77]);
  await rig.editor.readPatch();
  rig.device.received.length = 0;
  return rig;
}

function dt1(device: FakeGr55): number[][] {
  return device.received.filter((message) => message[6] === 0x12);
}

function addressOf(message: number[]): number {
  return (message[7] << 21) | (message[8] << 14) | (message[9] << 7) | message[10];
}

test('a full reread finishes with the default MIDI pace', async () => {
  const device = new FakeGr55();
  const midi = new MidiSession(device, device, RolandGR55SysExConfig, 0x10);
  const editor = new Gr55Editor(midi);
  const system = new Gr55System(midi);
  const intentions = createGr55Session(editor, system);
  await intentions.reread();
  expect(intentions.getState().phase).not.toBe('uncertain');
  expect(intentions.getState().blocked).toBe(false);
}, 20_000);

describe('GR-55 intention recipes', () => {
  test('harmonica on expression writes only its fields and reads back', async () => {
    const { device, editor, intentions } = await ready();
    const result = await intentions.apply({ kind: 'recipe', id: 'nylon-harmonica-exp' });
    expect(result).toEqual({ ok: true });
    expect(intentions.getState().confirmed?.recipeId).toBe('nylon-harmonica-exp');
    expect(editor.read(patch.patchPCMTone1.toneSelect)).toEqual({ ok: true, value: 'Harmonica 1' });
    expect(editor.read(patch.patchPCMTone1.partLevel)).toEqual({ ok: true, value: 100 });
    expect(editor.read(patch.patchPCMTone1.muteSwitch)).toEqual({ ok: true, value: false });
    expect(editor.read(patch.patchPCMTone2.partLevel)).toEqual({ ok: true, value: 0 });
    expect(editor.read(patch.common.normalPuLevel)).toEqual({ ok: true, value: 100 });
    expect(editor.read(patch.common.normalPuMute)).toEqual({ ok: true, value: false });
    expect(editor.read(patch.modelingTone.muteSwitch)).toEqual({ ok: true, value: true });
    expect(editor.read(patch.common.expPdlOff.function)).toEqual({ ok: true, value: 'TONE VOLUME' });
    expect(editor.read(patch.common.expPdlOff.volumeSwitchPCMTone1)).toEqual({ ok: true, value: true });
    expect(editor.read(reverbLevel)).toEqual({ ok: true, value: 77 });
    const addresses = dt1(device).map(addressOf);
    expect(addresses).not.toContain(GR55_MAP.setup.patchPc.address);
    expect(addresses).not.toContain(GR55_MAP.setup.patchBsMsb.address);
    expect(addresses.length).toBeGreaterThan(0);
  });

  test('piano and strings on CTL read back without touching expression', async () => {
    const { editor, intentions } = await ready();
    const result = await intentions.apply({ kind: 'recipe', id: 'nylon-piano-strings-ctl' });
    expect(result).toEqual({ ok: true });
    expect(intentions.getState().confirmed?.recipeId).toBe('nylon-piano-strings-ctl');
    expect(editor.read(patch.patchPCMTone1.toneSelect)).toEqual({ ok: true, value: 'St.Piano 1' });
    expect(editor.read(patch.patchPCMTone1.partLevel)).toEqual({ ok: true, value: 80 });
    expect(editor.read(patch.patchPCMTone2.toneSelect)).toEqual({ ok: true, value: 'Strings 1' });
    expect(editor.read(patch.patchPCMTone2.partLevel)).toEqual({ ok: true, value: 70 });
    expect(editor.read(patch.common.ctl.function)).toEqual({ ok: true, value: 'TONE SW' });
    expect(editor.read(patch.common.ctl.offPcmTone2Switch)).toEqual({ ok: true, value: false });
    expect(editor.read(patch.common.ctl.onPcmTone2Switch)).toEqual({ ok: true, value: true });
    expect(editor.read(patch.common.expPdlOff.function)).toEqual({ ok: true, value: 'OFF' });
    expect(editor.read(reverbLevel)).toEqual({ ok: true, value: 77 });
  });

  test('solo without the guitar mutes the normal signal', async () => {
    const { editor, intentions } = await ready();
    const result = await intentions.apply({ kind: 'recipe', id: 'solo-without-guitar' });
    expect(result).toEqual({ ok: true });
    expect(intentions.getState().confirmed?.recipeId).toBe('solo-without-guitar');
    expect(editor.read(patch.common.normalPuMute)).toEqual({ ok: true, value: true });
    expect(editor.read(patch.common.normalPuLevel)).toEqual({ ok: true, value: 0 });
    expect(editor.read(patch.patchPCMTone1.toneSelect)).toEqual({ ok: true, value: 'Alto Sax' });
    expect(editor.read(patch.common.expPdlOff.function)).toEqual({ ok: true, value: 'OFF' });
    expect(editor.read(patch.common.ctl.function)).toEqual({ ok: true, value: 'OFF' });
  });

  test('a busy expression is refused before any data write', async () => {
    const { device, editor, intentions } = await ready();
    editor.write(patch.common.expPdlOff.function, 'PATCH VOLUME');
    await new Promise((resolve) => setTimeout(resolve, 30));
    device.received.length = 0;
    const result = await intentions.apply({ kind: 'recipe', id: 'nylon-harmonica-exp' });
    expect(result).toEqual({ ok: false, code: 'refused', control: 'expression' });
    expect(dt1(device)).toHaveLength(0);
    expect(editor.read(reverbLevel)).toEqual({ ok: true, value: 77 });
  });

  test('a busy CTL is refused before any data write', async () => {
    const { device, editor, intentions } = await ready();
    editor.write(patch.common.ctl.function, 'HOLD');
    await new Promise((resolve) => setTimeout(resolve, 30));
    device.received.length = 0;
    const result = await intentions.apply({ kind: 'recipe', id: 'nylon-piano-strings-ctl' });
    expect(result).toEqual({ ok: false, code: 'refused', control: 'ctl' });
    expect(dt1(device)).toHaveLength(0);
  });

  test('a dropped reply leaves the session uncertain and blocks the next edit', async () => {
    const { device, intentions } = await ready();
    device.dropRequests = 1;
    const failed = await intentions.apply({ kind: 'recipe', id: 'solo-without-guitar' });
    expect(failed.ok).toBe(false);
    expect(intentions.getState().blocked).toBe(true);
    expect(intentions.getState().phase).toBe('uncertain');
    device.received.length = 0;
    const again = await intentions.apply({ kind: 'recipe', id: 'solo-without-guitar' });
    expect(again).toEqual({ ok: false, code: 'blocked' });
    expect(dt1(device)).toHaveLength(0);
  });

  test('save reads the USER slot back and a corrupt write does not count as saved', async () => {
    const { device, intentions } = await ready();
    const applied = await intentions.apply({ kind: 'recipe', id: 'nylon-harmonica-exp' });
    expect(applied).toEqual({ ok: true });
    const saved = await intentions.save(4);
    expect(saved).toEqual({ ok: true });
    expect(intentions.getState().confirmed?.userSlot).toBe(4);
    expect(intentions.getState().phase).toBe('saved');

    device.corruptNextWrite = true;
    const bad = await intentions.save(5);
    expect(bad).toEqual({ ok: false, code: 'mismatch' });
    expect(intentions.getState().blocked).toBe(true);
  });
});
