import { describe, expect, it } from 'vitest';
import { suggestRallyeCode } from './rallye-code';

describe('suggestRallyeCode', () => {
  it('produces a short word-and-digits code', () => {
    for (let i = 0; i < 20; i++) {
      expect(suggestRallyeCode()).toMatch(/^[a-z]+-\d{3}$/);
    }
  });
});
