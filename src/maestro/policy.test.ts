import { describe, expect, it } from 'vitest';
import { TEMPORARY_PATCH_ADDRESS } from '../devices/gr55/patchLayout';
import type { RegistryEntry } from './fieldRegistry';
import { decide } from './policy';

const working: RegistryEntry = {
  key: 'amp/amp/ampGain',
  pageId: 'amp',
  sectionSlug: 'amp',
  fieldKey: 'ampGain',
  label: 'Amp Gain',
  ref: {
    address: TEMPORARY_PATCH_ADDRESS + 1,
    definition: { description: 'Amp Gain' },
  } as RegistryEntry['ref'],
  kind: 'numeric',
  essential: true,
  readOnly: false,
  complex: false,
  min: 0,
  max: 120,
};

const systemish: RegistryEntry = {
  ...working,
  key: 'system/fake',
  ref: { address: 0x00000001, definition: { description: 'System' } } as RegistryEntry['ref'],
};

describe('policy.decide', () => {
  it.each([
    [
      'changePlan working-copy on bank',
      working,
      'changePlan' as const,
      { stageLive: false, session: 'bank' as const },
      'allow',
    ],
    [
      'loadSlot asks on bank',
      null,
      'loadSlot' as const,
      { stageLive: false, session: 'bank' as const },
      'ask',
    ],
    ['system scope denied', systemish, 'changePlan' as const, { stageLive: false }, 'deny'],
    [
      'writeSlot allowed on bank',
      null,
      'writeSlot' as const,
      { stageLive: false, session: 'bank' as const },
      'allow',
    ],
    [
      'writeSlot denied outside bank',
      null,
      'writeSlot' as const,
      { stageLive: false, session: 'system' as const },
      'deny',
    ],
    [
      'writeSystem allowed on global',
      null,
      'writeSystem' as const,
      { stageLive: false, session: 'system' as const },
      'allow',
    ],
    [
      'writeSystem denied on bank',
      null,
      'writeSystem' as const,
      { stageLive: false, session: 'bank' as const },
      'deny',
    ],
    ['factoryReset denied', null, 'factoryReset' as const, { stageLive: false }, 'deny'],
    ['null entry change denied', null, 'changePlan' as const, { stageLive: false }, 'deny'],
    [
      'stageSystemPlan allowed on global',
      null,
      'stageSystemPlan' as const,
      { stageLive: false, session: 'system' as const },
      'allow',
    ],
    [
      'stageSystemPlan denied on bank',
      null,
      'stageSystemPlan' as const,
      { stageLive: false, session: 'bank' as const },
      'deny',
    ],
    [
      'changePlan denied in system session',
      working,
      'changePlan' as const,
      { stageLive: false, session: 'system' as const },
      'deny',
    ],
    [
      'loadSlot denied without bank/library session',
      null,
      'loadSlot' as const,
      { stageLive: false, session: 'patch' as const },
      'deny',
    ],
    [
      'loadSlot ask in library session',
      null,
      'loadSlot' as const,
      { stageLive: false, session: 'library' as const },
      'ask',
    ],
  ])('%s', (_name, entry, action, ctx, expected) => {
    expect(decide(entry, action, ctx)).toBe(expected);
  });
});
