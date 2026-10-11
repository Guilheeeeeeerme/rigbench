import { describe, expect, it } from 'vitest';
import { TEMPORARY_PATCH_ADDRESS } from '../../devices/gr55/patchLayout';
import { SYSTEM } from '../../devices/gr55/systemMap';
import type { Gr55Editor } from '../../devices/gr55/editor';
import type { Gr55System } from '../../devices/gr55/systemState';
import { buildFieldRegistry, registryIndex } from '../fieldRegistry';
import { applyMacroOption } from './apply';
import { matchGroup } from './match';
import { findGroup, groupsForSession, MACRO_GROUPS } from './registry';

function fakeEditor(values: Record<string, unknown>): Gr55Editor {
  const index = registryIndex(buildFieldRegistry('GUITAR'));
  return {
    write: (ref: { address: number }, value: unknown) => {
      for (const [key, entry] of index) {
        if (entry.ref.address === ref.address) {
          values[key] = value;
          return;
        }
      }
    },
    read: (ref: { address: number }) => {
      for (const [key, entry] of index) {
        if (entry.ref.address === ref.address) {
          if (key in values) return { ok: true as const, value: values[key] };
          // Unset fields are not comparable — avoid false “Dry” matches.
          return { ok: false as const, raw: new Uint8Array() };
        }
      }
      return { ok: false as const, raw: new Uint8Array() };
    },
  } as unknown as Gr55Editor;
}

function fakeSystem(staged: Record<string, unknown>): Gr55System {
  return {
    read: (field: { address: number }) => {
      if (field.address === SYSTEM.common.gkSetSelect.address) {
        return { ok: true as const, value: staged['common.gkSetSelect'] ?? 0 };
      }
      if (field.address === SYSTEM.common.outputSelect.address) {
        return { ok: true as const, value: staged['common.outputSelect'] ?? 'LINE/PHONES' };
      }
      const key = Object.keys(staged).find(() => false);
      void key;
      return { ok: true as const, value: staged[String(field.address)] ?? 0 };
    },
    write: (field: { address: number }, value: unknown) => {
      if (field.address === SYSTEM.common.outputSelect.address) {
        staged['common.outputSelect'] = value;
        return;
      }
      if (field.address === SYSTEM.common.gkSetSelect.address) {
        staged['common.gkSetSelect'] = value;
        return;
      }
      staged[String(field.address)] = value;
    },
  } as unknown as Gr55System;
}

describe('macro registry scaffold', () => {
  it('lists every session group from the UX doc', () => {
    expect(groupsForSession('system')).toHaveLength(7);
    expect(groupsForSession('patch')).toHaveLength(14);
    expect(groupsForSession('bank')).toHaveLength(14);
    expect(groupsForSession('library')).toHaveLength(3);
    expect(MACRO_GROUPS).toHaveLength(24);
  });

  it('marks priority Patch groups implemented with writes', () => {
    for (const id of ['layers', 'amp-grit', 'atmosphere', 'synth-voice', 'loudness']) {
      const group = findGroup(id);
      expect(group?.implemented).toBe(true);
      expect(group?.options.some((option) => option.writes.length > 0)).toBe(true);
    }
  });

  it('implements System instrument and speakers', () => {
    expect(findGroup('instrument')?.implemented).toBe(true);
    expect(findGroup('speakers')?.implemented).toBe(true);
  });
});

describe('applyMacroOption', () => {
  const index = registryIndex(buildFieldRegistry('GUITAR'));

  it('writes a Layers bundle through the editor', () => {
    const values: Record<string, unknown> = {};
    const editor = fakeEditor(values);
    const group = findGroup('layers')!;
    const option = group.options.find((item) => item.id === 'guitar-only')!;
    const result = applyMacroOption(group, option, {
      editor,
      index,
      policy: { stageLive: false, session: 'patch' },
    });
    expect(result).toEqual({ ok: true, wrote: 5, staged: 0, filter: undefined });
    expect(values['pcm1/tone/muteSwitch']).toBe(true);
    expect(values['normal-pickup/level/normalPuMute']).toBe(false);
    expect(values['normal-pickup/level/normalPuLevel']).toBe(80);
  });

  it('denies patch macros in the System session', () => {
    const group = findGroup('layers')!;
    const option = group.options[0];
    const result = applyMacroOption(group, option, {
      editor: fakeEditor({}),
      index,
      policy: { stageLive: false, session: 'system' },
    });
    expect(result).toEqual({ ok: false, reason: 'denied' });
  });

  it('writes Speakers onto the system image immediately', () => {
    const staged: Record<string, unknown> = {};
    const system = fakeSystem(staged);
    const group = findGroup('speakers')!;
    const option = group.options.find((item) => item.id === 'combo')!;
    const result = applyMacroOption(group, option, {
      system,
      index,
      policy: { stageLive: false, session: 'system' },
    });
    expect(result).toEqual({ ok: true, wrote: 1, staged: 0, filter: undefined });
    expect(staged['common.outputSelect']).toBe('JC-120');
  });

  it('denies system writes from the Bank session', () => {
    const group = findGroup('speakers')!;
    const result = applyMacroOption(group, group.options[0], {
      system: fakeSystem({}),
      index,
      policy: { stageLive: false, session: 'bank' },
    });
    expect(result).toEqual({ ok: false, reason: 'denied' });
  });

  it('returns stub for unimplemented groups', () => {
    const group = findGroup('tone-shape')!;
    const result = applyMacroOption(group, group.options[0], {
      editor: fakeEditor({}),
      index,
      policy: { stageLive: false, session: 'patch' },
    });
    expect(result).toEqual({ ok: false, reason: 'stub' });
  });
});

describe('matchGroup', () => {
  const index = registryIndex(buildFieldRegistry('GUITAR'));

  it('matches an Atmosphere option after apply', () => {
    const values: Record<string, unknown> = {};
    const editor = fakeEditor(values);
    const group = findGroup('atmosphere')!;
    const dry = group.options.find((item) => item.id === 'dry')!;
    applyMacroOption(group, dry, {
      editor,
      index,
      policy: { stageLive: false, session: 'patch' },
    });
    const match = matchGroup(group, editor, undefined, index);
    expect(match).toMatchObject({ kind: 'option', optionId: 'dry' });
  });

  it('reports custom when fields diverge', () => {
    const values: Record<string, unknown> = {
      'chorus/chorus/chorusSwitch': true,
      'chorus/chorus/chorusEffectLevel': 10,
      'delay/delay/delaySwitch': false,
      'delay/delay/delayEffectLevel': 0,
      'reverb/reverb/reverbSwitch': false,
      'reverb/reverb/reverbEffectLevel': 0,
    };
    const editor = fakeEditor(values);
    const match = matchGroup(findGroup('atmosphere')!, editor, undefined, index);
    expect(match.kind).toBe('custom');
  });

  it('registry keys for implemented patch writes resolve', () => {
    for (const group of MACRO_GROUPS) {
      if (!group.implemented || group.session !== 'patch') continue;
      for (const option of group.options) {
        for (const write of option.writes) {
          if (write.domain !== 'patch') continue;
          expect(index.has(write.key), write.key).toBe(true);
          expect(index.get(write.key)!.ref.address).toBeGreaterThanOrEqual(TEMPORARY_PATCH_ADDRESS);
        }
      }
    }
  });
});
