import { describe, expect, it } from 'vitest';
import type { RegistryEntry } from './fieldRegistry';
import { SEARCH_VOCABULARY_HINT, assembleContext, serializeContext } from './contextLadder';

function stub(
  partial: Partial<RegistryEntry> & Pick<RegistryEntry, 'key' | 'label' | 'pageId' | 'fieldKey'>,
): RegistryEntry {
  return {
    sectionSlug: 's',
    ref: {
      address: 0x20000000,
      definition: { description: partial.label },
    } as RegistryEntry['ref'],
    kind: 'numeric',
    essential: false,
    readOnly: false,
    complex: false,
    min: 0,
    max: 100,
    ...partial,
  };
}

const entries: RegistryEntry[] = [
  stub({
    key: 'reverb/reverb/reverbTime',
    fieldKey: 'reverbTime',
    label: 'Reverb Time',
    pageId: 'reverb',
    essential: false,
  }),
  stub({
    key: 'amp/amp/ampGain',
    fieldKey: 'ampGain',
    label: 'Amp Gain',
    pageId: 'amp',
    essential: true,
  }),
  stub({
    key: 'chorus/chorus/chorusDepth',
    fieldKey: 'chorusDepth',
    label: 'Chorus Depth',
    pageId: 'chorus',
    essential: false,
  }),
  stub({
    key: 'patch/common/patchAttribute',
    fieldKey: 'patchAttribute',
    label: 'Patch Attribute',
    pageId: 'patch',
    readOnly: true,
  }),
];

const readValue = (entry: RegistryEntry) => `val:${entry.fieldKey}`;

const baseRequest = {
  query: '',
  patchName: 'Blues',
  sourceNote: 'slot U01:1',
  modeNote: 'GUITAR',
};

describe('assembleContext', () => {
  it('promotes a query token hit to full', () => {
    const fields = assembleContext(entries, readValue, { ...baseRequest, query: 'reverb wash' });
    const reverb = fields.find((field) => field.entry.key.includes('reverb'));
    expect(reverb?.depth).toBe('full');
  });

  it('always promotes essential fields to full', () => {
    const fields = assembleContext(entries, readValue, { ...baseRequest, query: 'xyzzy' });
    const amp = fields.find((field) => field.entry.fieldKey === 'ampGain');
    expect(amp?.depth).toBe('full');
  });

  it('marks the visible page as brief when not otherwise promoted', () => {
    const fields = assembleContext(entries, readValue, {
      ...baseRequest,
      query: 'xyzzy',
      visiblePageId: 'chorus',
    });
    const chorus = fields.find((field) => field.entry.pageId === 'chorus');
    expect(chorus?.depth).toBe('brief');
  });

  it('demotes full fields from the bottom to shrink toward the budget', () => {
    const full = assembleContext(entries, readValue, {
      ...baseRequest,
      query: 'reverb chorus depth time',
    });
    const fullCount = full.filter((field) => field.depth === 'full').length;
    expect(fullCount).toBeGreaterThan(1);
    const fullLen = serializeContext(full, baseRequest).length;
    const fields = assembleContext(entries, readValue, {
      ...baseRequest,
      query: 'reverb chorus depth time',
      charBudget: 1,
    });
    const briefCount = fields.filter((field) => field.depth === 'brief').length;
    expect(briefCount).toBe(fullCount);
    expect(serializeContext(fields, baseRequest).length).toBeLessThan(fullLen);
  });

  it('never includes readOnly fields', () => {
    const fields = assembleContext(entries, readValue, {
      ...baseRequest,
      query: 'patch attribute',
    });
    expect(fields.every((field) => !field.entry.readOnly)).toBe(true);
    const serialized = serializeContext(fields, baseRequest);
    expect(serialized).not.toContain('patchAttribute');
  });

  it('serialization carries the search vocabulary hint', () => {
    const fields = assembleContext(entries, readValue, {
      ...baseRequest,
      query: 'xyzzy',
      visiblePageId: 'chorus',
    });
    const serialized = serializeContext(fields, baseRequest);
    expect(serialized).toContain(SEARCH_VOCABULARY_HINT);
  });
});
