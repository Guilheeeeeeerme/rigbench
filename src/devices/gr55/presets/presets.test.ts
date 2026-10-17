import { describe, expect, test } from 'vitest';
import { MidiSession } from '../../../midi/session';
import { RolandGR55SysExConfig } from '../../../protocol/RolandDevices';
import { FakeGr55 } from '../fakeDevice';
import { Gr55Editor } from '../editor';
import { Gr55System } from '../systemState';
import { TEMPORARY_PATCH } from '../patchLayout';
import { shippedPresets, presetOf, PRESETS } from './catalog';
import { applyPresetToTemp } from './applyPreset';
import { applyCtlExpForPreset } from './applyCtlExp';
import { brazilianRhythms, cumbiaRhythms, RHYTHMS } from './taxonomy';
import { validateCatalogIntegrity } from './validate';
import {
  profileOf,
  gkWritesForProfile,
  calibrationOf,
  CAIMBE_CALIBRATIONS,
} from '../instrumentProfiles';
import { applyGhostNoteIsolate, applyTroubleFix } from '../troubleshooting';
import { SYSTEM, gkSet } from '../systemMap';

function setUp() {
  const device = new FakeGr55();
  const session = new MidiSession(device, device, RolandGR55SysExConfig, 0x10, {
    gapMs: 0,
    timeoutMs: 500,
  });
  const editor = new Gr55Editor(session, () => undefined, { patchChangeSettleMs: 0 });
  const system = new Gr55System(session);
  return { device, editor, system };
}

describe('brazilian rhythm catalog', () => {
  test('catalog integrity: 40 BR + cumbia × ≥4, tones, ranges', () => {
    const issues = validateCatalogIntegrity();
    expect(issues, JSON.stringify(issues.slice(0, 20), null, 2)).toEqual([]);
  });

  test('ships at least 160 presets across 45 rhythms', () => {
    expect(brazilianRhythms()).toHaveLength(40);
    expect(cumbiaRhythms()).toHaveLength(5);
    expect(RHYTHMS.length).toBe(45);
    expect(shippedPresets().length).toBeGreaterThanOrEqual(160);
  });

  test('every shipped preset has required metadata', () => {
    const rhythmIds = new Set(RHYTHMS.map((rhythm) => rhythm.id));
    for (const preset of shippedPresets()) {
      expect(rhythmIds.has(preset.rhythmId)).toBe(true);
      expect(preset.nameEn.length).toBeGreaterThan(0);
      expect(preset.ctlExp.ctl).toBeTruthy();
      expect(preset.chain).toBeDefined();
      expect(preset.pitchShift ?? 0).toBe(0);
      expect(preset.validationStatus).toMatch(
        /documented|implemented|hardware-tested|approximation/,
      );
      expect(preset.validationStatus).not.toBe('hardware-tested');
    }
  });

  test('approximations are never labeled hardware-tested', () => {
    for (const preset of PRESETS) {
      if (preset.validationStatus === 'approximation') {
        expect(preset.validationStatus).not.toBe('hardware-tested');
      }
    }
  });

  test('every shipped preset declares an explicit FX chain', () => {
    for (const preset of shippedPresets()) {
      expect(preset.chain, preset.id).toBeDefined();
      expect(preset.chain!.ampOn).toBeTypeOf('boolean');
    }
  });

  test('applyPresetToTemp writes without throwing', async () => {
    const { editor } = setUp();
    await editor.readPatch();
    const sax = shippedPresets().find((preset) => preset.pcm1 === 'Alto Sax')!;
    expect(sax).toBeDefined();
    const result = applyPresetToTemp(editor, sax);
    expect(result.ok).toBe(true);
    expect(result.wrote).toBeGreaterThan(0);
  });

  test('cross-family replace clears amp leftovers', async () => {
    const { editor } = setUp();
    await editor.readPatch();
    const rock = shippedPresets().find(
      (preset) => preset.architectureId === 'amp-guitar' || preset.chain?.ampOn,
    )!;
    const dry = shippedPresets().find(
      (preset) => preset.pcm1 === 'Flute 1' && !preset.modelingOn,
    )!;
    applyPresetToTemp(editor, rock);
    applyPresetToTemp(editor, dry);
    const patch = TEMPORARY_PATCH;
    expect(editor.read(patch.ampModNs.ampSwitch)).toEqual({ ok: true, value: false });
  });

  test('replace clears ASSIGN switches so leftovers cannot hijack pedals', async () => {
    const { editor } = setUp();
    await editor.readPatch();
    const patch = TEMPORARY_PATCH;
    editor.write(patch.common.assign1.switch, true);
    editor.write(patch.common.assign3.switch, true);
    const preset = shippedPresets()[0]!;
    applyPresetToTemp(editor, preset);
    expect(editor.read(patch.common.assign1.switch)).toEqual({ ok: true, value: false });
    expect(editor.read(patch.common.assign3.switch)).toEqual({ ok: true, value: false });
  });

  test('applyPreset path never writes GK SENS / PU TYPE', async () => {
    const { editor, system } = setUp();
    await editor.readPatch();
    await system.load();
    const preset =
      shippedPresets().find((item) => item.ctlExp.ctl === 'tone-switch') ?? shippedPresets()[0]!;
    const set = gkSet(1);
    const beforePu = system.read(set.puType);
    const beforeSens = system.read(set.string1Sens);
    applyPresetToTemp(editor, preset);
    applyCtlExpForPreset(system, preset);
    expect(system.read(set.puType)).toEqual(beforePu);
    expect(system.read(set.string1Sens)).toEqual(beforeSens);
    // CTL gate may touch SYSTEM pedals only — never GK.
    expect(system.read(SYSTEM.pedals.ctlFunction).ok).toBe(true);
  });

  test('same-rhythm slots are not name-only architecture clones', () => {
    const issues = validateCatalogIntegrity().filter((issue) => issue.code === 'duplicate-arch');
    expect(issues, JSON.stringify(issues, null, 2)).toEqual([]);
  });

  test('replace defaults pitch shift to session 0; profile may set chromatic', async () => {
    const { editor } = setUp();
    await editor.readPatch();
    const preset = shippedPresets().find((item) => item.articulationProfile === 'A')!;
    applyPresetToTemp(editor, preset, { pitchShift: 0 });
    const patch = TEMPORARY_PATCH;
    expect(editor.read(patch.patchPCMTone1.partCoarseTune)).toEqual({ ok: true, value: 0 });
    expect(editor.read(patch.patchPCMTone1.chromatic)).toEqual({
      ok: true,
      value: Boolean(preset.chromatic),
    });
  });

  test('session pitch override is applied and chromatic override wins over profile', async () => {
    const { editor } = setUp();
    await editor.readPatch();
    const preset = shippedPresets().find((item) => item.chromatic === true)!;
    applyPresetToTemp(editor, preset, { pitchShift: 7, chromatic: false });
    const patch = TEMPORARY_PATCH;
    expect(editor.read(patch.patchPCMTone1.partCoarseTune)).toEqual({ ok: true, value: 7 });
    expect(editor.read(patch.patchPCMTone1.chromatic)).toEqual({ ok: true, value: false });
  });

  test('instrument profile produces GK writes with documented PU TYPE', () => {
    const profile = profileOf('godin-multiac-nylon')!;
    const writes = gkWritesForProfile(profile);
    expect(writes.some((write) => write.field === 'puType' && write.value === 'PIEZO R')).toBe(
      true,
    );
  });

  test('Caimbé Nylon Anti-Ghost / Natural / Equilibrado write correct GK fields', () => {
    const profile = profileOf('caimbe-nylon')!;
    expect(profile.gkSetName).toBe('CAIMBE');
    expect(profile.confirmPiezoBrand).toBe(true);
    expect(profile.puType).toBe('PIEZO');
    expect(profile.sensSeed).toBeGreaterThanOrEqual(25);
    expect(profile.sensSeed).toBeLessThanOrEqual(30);
    expect(CAIMBE_CALIBRATIONS).toHaveLength(3);

    const anti = gkWritesForProfile(profile, undefined, 'anti-ghost');
    expect(anti.find((w) => w.field === 'velocityDynamics')?.value).toBe(5);
    expect(anti.find((w) => w.field === 'playFeel')?.value).toBe(4);
    expect(anti.find((w) => w.field === 'lowVelocityCut')?.value).toBe(8);
    expect(anti.find((w) => w.field === 'nuanceDynamics')?.value).toBe(0);
    expect(anti.find((w) => w.field === 'downTune')?.value).toBe(0);
    expect(anti.find((w) => w.field === 'piezoToneLow')?.value).toBe(0);

    const natural = gkWritesForProfile(profile, undefined, 'natural');
    expect(natural.find((w) => w.field === 'velocityDynamics')?.value).toBe(4);
    expect(natural.find((w) => w.field === 'playFeel')?.value).toBe(3);
    expect(natural.find((w) => w.field === 'lowVelocityCut')?.value).toBe(3);

    const eq = gkWritesForProfile(profile, undefined, 'equilibrado');
    expect(eq.find((w) => w.field === 'velocityDynamics')?.value).toBe(5);
    expect(eq.find((w) => w.field === 'playFeel')?.value).toBe(3);
    expect(eq.find((w) => w.field === 'lowVelocityCut')?.value).toBe(5);

    expect(calibrationOf(profile, 'anti-ghost')?.id).toBe('anti-ghost');
  });

  test('priority pagode + sertanejo presets validate Tone Map and pitch 0', () => {
    const ids = [
      'pagode-romantico-priority-piano-strings',
      'pagode-90s-priority-rhodes-strings',
      'pagode-romantico-priority-raca-negra-sax',
      'pagode-romantico-priority-sax-suave',
      'pagode-90s-priority-metais-spc',
      'pagode-roda-priority-flauta',
      'pagode-romantico-priority-gaita',
      'pagode-90s-priority-piano-metais',
      'sertanejo-raiz-priority-sanfona',
      'sertanejo-raiz-priority-sanfona-dupla',
      'sertanejo-romantico-priority-gaita',
      'sertanejo-romantico-priority-piano',
      'sertanejo-universitario-priority-rhodes',
      'sertanejo-romantico-priority-violino',
      'sertanejo-pop-priority-strings',
      'sertanejo-universitario-priority-country',
    ];
    const expected: Record<string, { pcm1?: string; pcm2?: string; modeling?: string }> = {
      'pagode-romantico-priority-piano-strings': { pcm1: 'Pop Piano 1', pcm2: 'Slow Strings' },
      'pagode-90s-priority-rhodes-strings': { pcm1: 'Stage EP 1', pcm2: 'Mood Strings' },
      'pagode-romantico-priority-raca-negra-sax': { pcm1: 'Tenor Sax 1' },
      'pagode-romantico-priority-sax-suave': { pcm1: 'BreathyTenor' },
      'pagode-90s-priority-metais-spc': { pcm1: 'Brass 1', pcm2: 'Trombone 1' },
      'pagode-roda-priority-flauta': { pcm1: 'Flute 1' },
      'pagode-romantico-priority-gaita': { pcm1: 'Harmonica 1' },
      'pagode-90s-priority-piano-metais': { pcm1: 'Stage Piano', pcm2: 'Brass 2' },
      'sertanejo-raiz-priority-sanfona': { pcm1: 'AccordionIt2' },
      'sertanejo-raiz-priority-sanfona-dupla': { pcm1: 'AccordionIt2', pcm2: 'Accordion It' },
      'sertanejo-romantico-priority-gaita': { pcm1: 'Harmonica 1' },
      'sertanejo-romantico-priority-piano': { pcm1: 'Pop Piano 1', pcm2: 'Slow Strings' },
      'sertanejo-universitario-priority-rhodes': { pcm1: 'Stage EP 1', pcm2: 'Mood Strings' },
      'sertanejo-romantico-priority-violino': { pcm1: 'Violin 1' },
      'sertanejo-pop-priority-strings': { pcm1: 'Strings 1', pcm2: 'Slow Strings' },
      'sertanejo-universitario-priority-country': { modeling: 'CLA-ST' },
    };

    for (const id of ids) {
      const preset = presetOf(id);
      expect(preset, id).toBeDefined();
      expect(preset!.priority).toBe(true);
      expect(preset!.pitchShift ?? 0).toBe(0);
      expect(preset!.validationStatus).not.toBe('hardware-tested');
      const want = expected[id]!;
      if (want.pcm1) expect(preset!.pcm1).toBe(want.pcm1);
      if (want.pcm2) expect(preset!.pcm2).toBe(want.pcm2);
      if (want.modeling) expect(preset!.modelingTone).toBe(want.modeling);
      const sources =
        Number(Boolean(preset!.pcm1On)) +
        Number(Boolean(preset!.pcm2On)) +
        Number(Boolean(preset!.modelingOn));
      expect(sources).toBeGreaterThanOrEqual(1);
    }
  });

  test('Raça Negra sax enables legato when chromatic', () => {
    const sax = presetOf('pagode-romantico-priority-raca-negra-sax')!;
    expect(sax.chromatic).toBe(true);
    expect(sax.legato).toBe(true);
  });

  test('ghost-note diagnostic isolates piano and seeds LVC', async () => {
    const { editor, system } = setUp();
    await editor.readPatch();
    await system.load();
    const isolate = applyGhostNoteIsolate(editor);
    expect(isolate.wrote).toBeGreaterThan(0);
    const patch = TEMPORARY_PATCH;
    expect(editor.read(patch.patchPCMTone1.toneSelect)).toEqual({
      ok: true,
      value: 'Pop Piano 1',
    });
    expect(editor.read(patch.patchPCMTone1.muteSwitch)).toEqual({ ok: true, value: false });
    expect(editor.read(patch.patchPCMTone2.muteSwitch)).toEqual({ ok: true, value: true });
    expect(editor.read(patch.ampModNs.ampSwitch)).toEqual({ ok: true, value: false });

    const result = applyTroubleFix(system, 'ghost-notes', editor);
    expect(result.wrote).toBeGreaterThan(0);
    expect(result.messageEn).toMatch(/Low Velocity Cut → 5/);
  });

  test('presetOf resolves composed ids', () => {
    const first = shippedPresets()[0]!;
    expect(presetOf(first.id)?.id).toBe(first.id);
  });
});
