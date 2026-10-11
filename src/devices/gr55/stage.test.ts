import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { MidiSession } from '../../midi/session';
import { RolandGR55SysExConfig } from '../../protocol/RolandDevices';
import { Gr55Editor } from './editor';
import { FakeGr55 } from './fakeDevice';
import { buildPages } from './pages';
import { PATCH_SPAN, TEMPORARY_PATCH, TEMPORARY_PATCH_ADDRESS } from './patchLayout';
import {
  SetlistFileError,
  changesPatch,
  exportSetlist,
  importSetlist,
  loadSetlist,
  moveSong,
  newSong,
  patchChangeCount,
  saveSetlist,
} from './setlist';
import { SETUP_STEPS, loadSetup, saveSetup, skippedSteps } from './setupState';
import { PEDAL_IDS, PEDAL_SECTIONS, readerOf, stageView } from './stageModel';

const common = TEMPORARY_PATCH.common;

/** Just enough of localStorage for the modules that keep their state there. */
function fakeStorage() {
  const items = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  });
  return items;
}

function setUp() {
  const device = new FakeGr55();
  const session = new MidiSession(device, device, RolandGR55SysExConfig, 0x10, {
    gapMs: 0,
    timeoutMs: 500,
  });
  return { device, session, editor: new Gr55Editor(session) };
}

function settle(ms = 30) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('setlist', () => {
  beforeEach(() => void fakeStorage());
  afterEach(() => vi.unstubAllGlobals());

  const songs = [
    newSong('Opener', 'GUITAR', 3),
    newSong('Ballad', 'GUITAR', 3),
    newSong('Closer', 'GUITAR', 40),
  ];

  test('is kept on this computer and read back as it was', () => {
    saveSetlist({ name: 'Saturday', songs });
    expect(loadSetlist()).toEqual({ name: 'Saturday', songs });
  });

  test('an empty computer has an empty setlist', () => {
    expect(loadSetlist()).toEqual({ name: '', songs: [] });
  });

  test('moving a song reorders without losing any', () => {
    expect(moveSong(songs, 2, 0).map((song) => song.title)).toEqual(['Closer', 'Opener', 'Ballad']);
    expect(moveSong(songs, 0, 1).map((song) => song.title)).toEqual(['Ballad', 'Opener', 'Closer']);
    expect(moveSong(songs, 0, 9)).toEqual(songs);
  });

  test('only a change of slot is a patch change, with its second of silence', () => {
    expect(changesPatch(songs[0], songs[1])).toBe(false);
    expect(changesPatch(songs[1], songs[2])).toBe(true);
    expect(changesPatch(undefined, songs[0])).toBe(false);
    expect(patchChangeCount(songs)).toBe(1);
    expect(patchChangeCount(moveSong(songs, 2, 1))).toBe(2);
  });

  test('a setlist file round-trips, names of cuts included', () => {
    const named = [{ ...songs[0], cuts: { 'assign-2': 'Solo' } }, ...songs.slice(1)];
    const file = exportSetlist({ name: 'Saturday', songs: named });
    expect(importSetlist(file)).toEqual({ name: 'Saturday', songs: named });
  });

  test('a file that is not a setlist is refused, and bad songs in one are dropped', () => {
    expect(() => importSetlist('not json')).toThrow(SetlistFileError);
    expect(() => importSetlist('{"songs":[]}')).toThrow(SetlistFileError);
    const file = JSON.stringify({
      format: 'rigbench-gr55-setlist',
      version: 1,
      name: 'Odd',
      songs: [
        { title: 'Good', mode: 'BASS', userPatchNumber: 5, cuts: { 'assign-1': '  ' } },
        { title: 'No slot' },
        { title: 'Slot out of the pedal', userPatchNumber: 9999 },
        'nonsense',
      ],
    });
    const { songs: kept } = importSetlist(file);
    expect(kept).toHaveLength(1);
    expect(kept[0]).toMatchObject({ title: 'Good', mode: 'BASS', userPatchNumber: 5, cuts: {} });
  });
});

describe('stage setup state', () => {
  beforeEach(() => void fakeStorage());
  afterEach(() => vi.unstubAllGlobals());

  test('a pedal met for the first time has no setup', () => {
    expect(loadSetup()).toEqual({ rigName: '', steps: {}, complete: false, gkNotes: {} });
  });

  test('skipped steps are remembered for the Stage, sync aside', () => {
    saveSetup({
      rigName: 'Rig',
      steps: { rig: 'ok', backup: 'warn', midi: 'warn', sync: 'warn' },
      complete: true,
      gkNotes: { 2: 'Godin' },
    });
    const setup = loadSetup();
    expect(setup.complete).toBe(true);
    expect(setup.gkNotes[2]).toBe('Godin');
    expect(skippedSteps(setup)).toEqual(['midi', 'backup']);
    expect(SETUP_STEPS).toHaveLength(8);
  });
});

describe('stageView', () => {
  test('lists what each pedal does and only the assigns that are on', async () => {
    const { editor } = setUp();
    await editor.readPatch();
    editor.write(common.assign2.switch, true);
    editor.write(common.assign2.source, 'CTL');
    editor.write(common.assign5.switch, true);
    editor.write(common.assign5.source, 'EXP PEDAL SW');

    const view = stageView((field) => editor.read(field), 'GUITAR');
    expect(view.pedals.map((pedal) => pedal.id)).toEqual([...PEDAL_IDS]);
    expect(view.pedals.every((pedal) => typeof pedal.function === 'string')).toBe(true);
    expect(view.cuts.map((cut) => cut.key)).toEqual(['assign-2', 'assign-5']);
    expect(view.cuts[0]).toMatchObject({ number: 2, source: 'CTL' });
    expect(view.cuts[0].target).not.toBe('?');
  });

  test('a cut is active while its source pedal is on, as the pedal reports it', async () => {
    const { device, editor } = setUp();
    await editor.readPatch();
    editor.write(common.assign1.switch, true);
    editor.write(common.assign1.source, 'CTL');
    const cut = () => stageView((field) => editor.read(field), 'GUITAR').cuts[0];
    const ctl = () =>
      stageView((field) => editor.read(field), 'GUITAR').pedals.find((p) => p.id === 'ctl');
    expect(cut().active).toBe(false);
    expect(ctl()?.on).toBe(false);

    // The player steps on CTL: the pedal sends the new status by itself.
    const status = common.ctl.status;
    const bytes = new Uint8Array(1);
    status.definition.type.encode(true, bytes, 0, 1);
    device.poke(status.address, bytes);
    await editor.readPatch();
    await settle();
    expect(ctl()?.on).toBe(true);
    expect(cut().active).toBe(true);
  });

  test('reads a slot image from the sync cache the same way as the working copy', async () => {
    const { editor } = setUp();
    await editor.readPatch();
    editor.write(common.assign3.switch, true);
    const image = new Uint8Array(PATCH_SPAN);
    for (const field of [common.assign3.switch, common.assign3.source, common.assign3.target]) {
      const offset = field.address - TEMPORARY_PATCH_ADDRESS;
      const value = editor.read(field as never);
      const bytes = new Uint8Array(field.definition.size);
      (field.definition.type as { encode: (...args: unknown[]) => void }).encode(
        (value as { value: unknown }).value,
        bytes,
        0,
        bytes.length,
      );
      image.set(bytes, offset);
    }
    expect(stageView(readerOf(image), 'GUITAR').cuts.map((cut) => cut.key)).toEqual(['assign-3']);
  });

  test('every pedal links to a section the editor really has', () => {
    const page = buildPages('GUITAR').find((candidate) => candidate.id === 'pedal-gk')!;
    const slugs = page.sections.map((section) => section.slug);
    for (const id of PEDAL_IDS) {
      expect(slugs).toContain(PEDAL_SECTIONS[id]);
    }
    const assigns = buildPages('GUITAR').find((candidate) => candidate.id === 'assigns')!;
    expect(assigns.sections.map((section) => section.slug)).toContain('assign-8');
  });
});
