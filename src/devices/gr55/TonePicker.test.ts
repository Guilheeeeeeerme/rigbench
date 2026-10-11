import { describe, expect, it } from 'vitest';
import { filterToneLabels } from './TonePicker';

describe('filterToneLabels', () => {
  const labels = [
    'Harmonica 1',
    'Harmonica 2',
    'Brass 1',
    'Accordion Fr',
    'Soft Pad 1',
    'Steel Gt',
  ];

  it('returns the full catalog when the query is empty', () => {
    expect(filterToneLabels('', labels)).toEqual(labels);
  });

  it('ranks synonym hits for musician language', () => {
    const hits = filterToneLabels('gaita', labels);
    expect(hits.some((label) => /Harmonica|Accordion/.test(label))).toBe(true);
  });

  it('falls back to substring match', () => {
    const hits = filterToneLabels('pad', labels);
    expect(hits).toContain('Soft Pad 1');
  });
});
