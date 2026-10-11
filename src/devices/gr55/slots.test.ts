import { describe, expect, it } from 'vitest';
import { browsePatches, filterBrowsePatches, slotsOfMode } from './slots';

describe('browsePatches', () => {
  it('lists user and preset styles for guitar mode', () => {
    const all = browsePatches('GUITAR');
    const styles = new Set(all.map((patch) => patch.style));
    expect(styles.has('lead')).toBe(true);
    expect(styles.has('rhythm')).toBe(true);
    expect(styles.has('other')).toBe(true);
    expect(styles.has('user')).toBe(true);
    expect(all.length).toBeGreaterThan(slotsOfMode('GUITAR').length);
  });

  it('defaults filterBrowsePatches to user when style is undefined', () => {
    const filtered = filterBrowsePatches(browsePatches('GUITAR'), undefined);
    expect(filtered.every((patch) => patch.style === 'user')).toBe(true);
    expect(filtered.length).toBe(slotsOfMode('GUITAR').length);
  });

  it('filters lead bank', () => {
    const lead = filterBrowsePatches(browsePatches('GUITAR'), 'lead');
    expect(lead.length).toBeGreaterThan(0);
    expect(lead.every((patch) => patch.style === 'lead')).toBe(true);
    expect(lead[0]?.name).toBeTruthy();
  });
});
