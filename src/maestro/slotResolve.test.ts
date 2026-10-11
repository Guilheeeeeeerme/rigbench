import { describe, expect, it } from 'vitest';
import { resolveSlotLabel } from './slotResolve';

describe('resolveSlotLabel', () => {
  it('resolves U14:2 and 14-2 to the same slot', () => {
    const a = resolveSlotLabel('GUITAR', 'U14:2');
    const b = resolveSlotLabel('GUITAR', '14-2');
    expect(a).toBeDefined();
    expect(b).toBeDefined();
    expect(a!.label).toBe(b!.label);
    expect(a!.bankMsb).toBe(b!.bankMsb);
    expect(a!.programChange).toBe(b!.programChange);
  });

  it('resolves USER 01-2 style labels', () => {
    const hit = resolveSlotLabel('GUITAR', 'USER 01-2');
    expect(hit?.label).toBe('01-2');
  });

  it('returns undefined for unknown labels', () => {
    expect(resolveSlotLabel('GUITAR', 'Z99:9')).toBeUndefined();
  });
});

