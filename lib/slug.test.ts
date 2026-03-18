import { describe, it, expect } from 'vitest';
import { slugify } from './slug';

describe('slugify', () => {
  it('converts German text to lowercase slug', () => {
    expect(slugify('Campus Bibliothek Eingang')).toBe('campus-bibliothek-eingang');
  });

  it('replaces umlauts with ASCII equivalents', () => {
    expect(slugify('Größe und Tür')).toBe('groesse-und-tuer');
  });

  it('truncates to maxLength characters', () => {
    expect(slugify('A'.repeat(100), 50)).toHaveLength(50);
  });

  it('returns fallback for empty or whitespace-only input', () => {
    expect(slugify('')).toBe('qr-code');
    expect(slugify('   ')).toBe('qr-code');
  });
});
