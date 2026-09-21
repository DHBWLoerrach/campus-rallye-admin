import { describe, expect, it } from 'vitest';
import { getCampusTourRallyeIds, isCampusTourRallye } from './campus-tour';

describe('campus tour helpers', () => {
  it('deduplicates rallyes referenced by multiple locations', () => {
    const locations = [
      { default_rallye_id: 7 },
      { default_rallye_id: 7 },
      { default_rallye_id: null },
    ];

    expect(getCampusTourRallyeIds(locations)).toEqual(new Set([7]));
    expect(isCampusTourRallye(7, locations)).toBe(true);
    expect(isCampusTourRallye(8, locations)).toBe(false);
  });
});
